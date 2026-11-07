import type { Coordinates } from './nearby-helpers'
import type { TravelMode } from './travel-mode'

export const ROUTE_SUCCESS_TTL = 15 * 60_000
export const ROUTE_FAILURE_TTL = 30_000
const STORAGE_KEY = 'washjoy:route-times:v1'
const MAX_ENTRIES = 1000
export type RouteRequest = { mode: TravelMode; city: string; origin: Coordinates; destination: Coordinates }
type Entry = { duration: number | null; expires: number }
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>
type Job = { key: string; request: RouteRequest; signal: AbortSignal; background: boolean; resolve(value: number | null): void; promise: Promise<number | null> }

export function routeRequestKey(request: RouteRequest): string {
  return JSON.stringify([request.mode, request.city, request.origin.longitude, request.origin.latitude, request.destination.longitude, request.destination.latitude])
}

export class RouteCache {
  private entries = new Map<string, Entry>()
  private pending = new Map<string, Job>()
  private queue: Job[] = []
  private active = 0
  private backgroundActive = 0
  private storage?: Storage
  private hydrated = false

  private readonly compute: (request: RouteRequest, signal: AbortSignal) => Promise<number | null>
  private readonly now: () => number

  constructor(compute: (request: RouteRequest, signal: AbortSignal) => Promise<number | null>, now = Date.now, storage?: Storage) {
    this.compute = compute
    this.now = now
    this.storage = storage
  }

  private hydrate() {
    if (this.hydrated) return
    this.hydrated = true
    try {
      this.storage ??= typeof window !== 'undefined' ? window.localStorage : undefined
      const stored: unknown = JSON.parse(this.storage?.getItem(STORAGE_KEY) || '[]')
      if (!Array.isArray(stored)) return
      for (const item of stored.slice(-MAX_ENTRIES)) {
        if (!Array.isArray(item) || typeof item[0] !== 'string' || !item[1] || typeof item[1] !== 'object') continue
        const entry = item[1] as Partial<Entry>
        if (typeof entry.expires === 'number' && entry.expires > this.now() && (entry.duration === null || (typeof entry.duration === 'number' && Number.isFinite(entry.duration) && entry.duration >= 0))) {
          this.entries.set(item[0], entry as Entry)
        }
      }
    } catch { /* Browser privacy/quota restrictions leave an in-memory cache. */ }
  }

  peek(request: RouteRequest): Entry | undefined {
    this.hydrate()
    const key = routeRequestKey(request)
    const entry = this.entries.get(key)
    if (entry && entry.expires > this.now()) return entry
    this.entries.delete(key)
  }

  request(request: RouteRequest, signal: AbortSignal, background = false): Promise<number | null> {
    if (signal.aborted) return Promise.resolve(null)
    const cached = this.peek(request)
    if (cached) return Promise.resolve(cached.duration)
    const key = routeRequestKey(request)
    const previous = this.pending.get(key)
    if (previous && !previous.signal.aborted) {
      // Promote queued preheating as soon as it becomes foreground work.
      if (!background) previous.background = false
      this.drain()
      return previous.promise
    }
    let resolve!: Job['resolve']
    const promise = new Promise<number | null>((done) => { resolve = done })
    const job = { key, request, signal, background, resolve, promise }
    this.pending.set(key, job)
    this.queue.push(job)
    this.drain()
    return promise
  }

  private drain() {
    for (const job of this.queue.filter((item) => item.signal.aborted)) {
      this.queue.splice(this.queue.indexOf(job), 1)
      if (this.pending.get(job.key) === job) this.pending.delete(job.key)
      job.resolve(null)
    }
    while (this.active < 3) {
      const foreground = this.queue.findIndex((job) => !job.background)
      const index = foreground >= 0 ? foreground : this.backgroundActive === 0 ? 0 : -1
      if (index < 0 || !this.queue[index]) return
      const [job] = this.queue.splice(index, 1)
      const wasBackground = job.background
      this.active++
      if (wasBackground) this.backgroundActive++
      void this.run(job).finally(() => {
        this.active--
        if (wasBackground) this.backgroundActive--
        this.drain()
      })
    }
  }

  private async run(job: Job) {
    let duration: number | null = null
    try {
      const result = await this.compute(job.request, job.signal)
      duration = typeof result === 'number' && Number.isFinite(result) && result >= 0 ? result : null
    } catch { /* Failure receives only a short TTL, never permanent Infinity. */ }
    if (!job.signal.aborted) {
      this.entries.set(job.key, { duration, expires: this.now() + (duration === null ? ROUTE_FAILURE_TTL : ROUTE_SUCCESS_TTL) })
      for (const [key, entry] of this.entries) {
        if (entry.expires <= this.now()) this.entries.delete(key)
      }
      while (this.entries.size > MAX_ENTRIES) this.entries.delete(this.entries.keys().next().value!)
      try { this.storage?.setItem(STORAGE_KEY, JSON.stringify([...this.entries])) } catch { /* Quota/private mode. */ }
    }
    if (this.pending.get(job.key) === job) this.pending.delete(job.key)
    job.resolve(job.signal.aborted ? null : duration)
  }
}

// Iterate a bounded candidate batch; cancellation prevents issuing its next request.
export async function computeRouteBatch<T>(items: readonly T[], signal: AbortSignal, compute: (item: T) => Promise<number | null>, update: (item: T, duration: number | null) => void) {
  let cursor = 0
  await Promise.all(Array.from({ length: Math.min(3, items.length) }, async () => {
    while (!signal.aborted && cursor < items.length) {
      const item = items[cursor++]
      const duration = await compute(item)
      if (!signal.aborted) update(item, duration)
    }
  }))
}
