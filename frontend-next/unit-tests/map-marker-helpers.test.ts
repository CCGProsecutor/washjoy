import assert from 'node:assert/strict'
import test from 'node:test'
import { listenForViewport, markerContent, updateMarkerNames, visibleMarkerIds } from '../src/lib/map-marker-helpers.ts'
import type { ViewportMap } from '../src/lib/map-sdk-types.ts'

const places = Array.from({ length: 12 }, (_, index) => ({
  id: String(index), name: `门店${index}`, category: '洗浴中心', longitude: index, latitude: 32,
}))

test('names use actual viewport count: nine shows names, ten hides names', () => {
  let visibleCount = 9
  const bounds = { contains: ([lng]: [number, number]) => lng < visibleCount }
  const visible = new Map<string, boolean>()
  const pins = places.map(place => ({ dataset: { placeId: place.id }, classList: { toggle: (_: string, enabled: boolean) => visible.set(place.id, enabled) } }))
  const host = { querySelectorAll: () => pins } as unknown as HTMLElement
  updateMarkerNames(host, places, bounds)
  assert.equal(visibleMarkerIds(places, bounds).size, 9)
  assert.equal([...visible.values()].filter(Boolean).length, 9)
  assert.equal(visible.get('11'), false)
  visibleCount = 10
  updateMarkerNames(host, places, bounds)
  assert.equal([...visible.values()].some(Boolean), false)
  assert.equal(visibleMarkerIds([{ ...places[0], longitude: NaN }], bounds).size, 0)
  assert.equal(visibleMarkerIds(places, undefined).size, 0)
})

test('marker names and ids escape malicious markup while preserving text', () => {
  const content = markerContent({ ...places[0], id: '\" onclick="alert(1)', name: '<img src=x onerror="alert(1)"> & 浴场' })
  assert.ok(content.includes('&lt;img'))
  assert.ok(content.includes('&amp; 浴场'))
  assert.ok(content.includes('&quot; onclick=&quot;alert(1)'))
  assert.ok(!content.includes('<img'))
  assert.ok(!content.includes(' onclick="'))
  assert.ok(content.includes('type="button"'))
  assert.ok(content.includes('<svg'))
})

test('all five categories have distinct Lucide icons without numeric labels', () => {
  const categories = ['洗浴中心', '足疗会所', '大众澡堂', '街边店', '私汤']
  const icons = categories.map(category => markerContent({ ...places[0], name: '浴场', category }).match(/<svg.*?<\/svg>/)?.[0])
  assert.equal(new Set(icons).size, 5)
  assert.ok(icons.every(Boolean))
  assert.ok(!markerContent({ ...places[0], name: '浴场' }).includes('>1<'))
})

test('viewport updates subscribe to all events and remove the same callbacks', () => {
  const handlers = new Map<string, () => void>()
  const removed: string[] = []
  const map = {
    on: (event: string, callback: () => void) => handlers.set(event, callback),
    off: (event: string, callback: () => void) => { assert.equal(handlers.get(event), callback); removed.push(event); handlers.delete(event) },
  } as unknown as ViewportMap
  let updates = 0
  const cleanup = listenForViewport(map, () => updates++)
  assert.equal(updates, 1)
  assert.deepEqual([...handlers.keys()], ['moveend', 'zoomend', 'resize', 'complete'])
  handlers.forEach(callback => callback())
  assert.equal(updates, 5)
  cleanup()
  cleanup()
  assert.equal(removed.length, 4)
  assert.equal(handlers.size, 0)
})
