import assert from 'node:assert/strict'
import test from 'node:test'
import { computeRouteBatch, RouteCache, routeRequestKey, ROUTE_FAILURE_TTL, ROUTE_SUCCESS_TTL, type RouteRequest } from '../src/lib/route-cache.ts'

const request: RouteRequest = { mode: 'transit', city: '南京市', origin: { longitude: 118, latitude: 32 }, destination: { longitude: 118.1, latitude: 32.1 } }
const signal = () => new AbortController().signal
const tick = () => new Promise<void>((resolve) => setImmediate(resolve))

test('keys bind city, mode and precise origin/destination coordinates', () => {
  for (const changed of [
    { ...request, city: '上海市' }, { ...request, mode: 'car' as const },
    { ...request, origin: { ...request.origin, longitude: 118.000001 } },
    { ...request, destination: { ...request.destination, latitude: 32.100001 } },
  ]) assert.notEqual(routeRequestKey(changed), routeRequestKey(request))
})

test('success persists until TTL and expires across reloads', async () => {
  let time = 100
  let saved = ''
  const storage = { getItem: () => saved, setItem: (_key: string, value: string) => { saved = value } }
  const cache = new RouteCache(async () => 800, () => time, storage)
  assert.equal(await cache.request(request, signal()), 800)
  let calls = 0
  const reload = new RouteCache(async () => { calls++; return 900 }, () => time, storage)
  assert.equal(await reload.request(request, signal()), 800)
  assert.equal(calls, 0)
  time += ROUTE_SUCCESS_TTL
  assert.equal(await reload.request(request, signal()), 900)
  assert.equal(calls, 1)
})

test('failures are unknown with short TTL and recover on retry', async () => {
  let calls = 0
  let time = 100
  const cache = new RouteCache(async () => { if (++calls === 1) throw new Error('quota'); return 900 }, () => time)
  assert.equal(await cache.request(request, signal()), null)
  assert.equal(await cache.request(request, signal()), null)
  assert.equal(calls, 1)
  time += ROUTE_FAILURE_TTL
  assert.equal(await cache.request(request, signal()), 900)
})

test('concurrent destination lookups are deduplicated', async () => {
  let calls = 0
  let finish!: (value: number) => void
  const cache = new RouteCache(() => { calls++; return new Promise((resolve) => { finish = resolve }) })
  const first = cache.request(request, signal())
  const second = cache.request(request, signal())
  finish(60)
  assert.deepEqual(await Promise.all([first, second]), [60, 60])
  assert.equal(calls, 1)
})

test('old batch cancellation prevents later requests and late writes', async () => {
  let calls = 0
  const finish: Array<(value: number) => void> = []
  const cache = new RouteCache(() => { calls++; return new Promise((resolve) => { finish.push(resolve) }) })
  const controller = new AbortController()
  const updates: number[] = []
  const batch = computeRouteBatch(Array.from({ length: 30 }, (_, i) => i), controller.signal,
    (i) => cache.request({ ...request, destination: { longitude: 118 + i, latitude: 32 } }, controller.signal), (i) => { updates.push(i) })
  assert.equal(calls, 3)
  controller.abort()
  finish.forEach((resolve) => resolve(60))
  await batch
  assert.equal(calls, 3)
  assert.deepEqual(updates, [])
  assert.equal(cache.peek({ ...request, destination: { longitude: 118, latitude: 32 } }), undefined)
})

test('foreground bypasses queued preheat, whose concurrency is one', async () => {
  const starts: number[] = []
  const finish: Array<() => void> = []
  const cache = new RouteCache((input) => {
    starts.push(input.destination.longitude)
    return new Promise((resolve) => { finish.push(() => resolve(100)) })
  })
  const tasks = [1, 2, 3].map((id) => cache.request({ ...request, destination: { longitude: id, latitude: 32 } }, signal(), true))
  assert.deepEqual(starts, [1])
  for (const id of [4, 5]) tasks.push(cache.request({ ...request, destination: { longitude: id, latitude: 32 } }, signal()))
  assert.deepEqual(starts, [1, 4, 5])
  finish.slice().forEach((done) => done())
  await tick()
  assert.deepEqual(starts, [1, 4, 5, 2])
  finish[3]()
  await tick()
  finish[4]()
  await Promise.all(tasks)
})

test('progressive updates arrive before the slowest result', async () => {
  const updates: number[] = []
  let finish!: (value: number) => void
  const work = computeRouteBatch([0, 1, 2], signal(), (i) => i === 1 ? new Promise((resolve) => { finish = resolve }) : Promise.resolve(50), (i) => { updates.push(i) })
  await tick()
  assert.deepEqual(updates, [0, 2])
  finish(90)
  await work
  assert.deepEqual(updates, [0, 2, 1])
})

test('malformed storage and write quota do not prevent routing', async () => {
  const storage = { getItem: () => 'not-json', setItem: () => { throw new Error('quota') } }
  const cache = new RouteCache(async () => 40, Date.now, storage)
  assert.equal(await cache.request(request, signal()), 40)
  assert.equal(cache.peek(request)?.duration, 40)
})

test('queued cancelled jobs never start; replacement can run independently', async () => {
  const starts: number[] = []
  const finish: Array<() => void> = []
  const cache = new RouteCache((input) => {
    starts.push(input.destination.longitude)
    return new Promise((resolve) => { finish.push(() => resolve(70)) })
  })
  const tasks = [1, 2, 3].map((id) => cache.request({ ...request, destination: { longitude: id, latitude: 32 } }, signal()))
  const old = new AbortController()
  const queued = { ...request, destination: { longitude: 4, latitude: 32 } }
  tasks.push(cache.request(queued, old.signal))
  old.abort()
  tasks.push(cache.request(queued, signal()))
  finish[0]()
  await tick()
  assert.deepEqual(starts, [1, 2, 3, 4])
  finish.slice(1).forEach((done) => done())
  assert.deepEqual(await Promise.all(tasks), [70, 70, 70, null, 70])
})
