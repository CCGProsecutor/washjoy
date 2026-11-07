import { expect, type Page, type Route } from '@playwright/test'

export type TestPlace = {
  id: string
  name: string
  address: string
  city: string
  category?: string
  recommended?: boolean
  location?: string
  photos?: string[]
  rating?: number
  price?: number
  tags?: string[]
  adminManaged?: boolean
  manual?: boolean
}

export const places: TestPlace[] = Array.from({ length: 34 }, (_, index) => ({
  id: `place-${index + 1}`,
  name: index === 0 ? '栖霞云汤泉' : index === 1 ? '静安私汤' : `测试洗浴门店 ${index + 1}`,
  address: index === 0 ? '南京市玄武区钟山路 1 号' : `南京市测试路 ${index + 1} 号`,
  city: 'nanjing',
  category: index === 1 ? '私汤' : index % 3 === 0 ? '足疗会所' : '洗浴中心',
  recommended: index % 2 === 0,
  location: `${118.7969 + index * 0.0001},${32.0603 + index * 0.0001}`,
  photos: index === 0 ? ['https://images.invalid/washjoy-first.jpg'] : [],
  rating: 4.7,
  price: 98,
  tags: ['可过夜'],
  adminManaged: index === 0,
  manual: index === 0,
}))

type MockOptions = {
  session?: unknown | null
  publicDataStatus?: number
  saveStatus?: number
  reviewStatus?: number
  onApiRequest?: (route: Route) => Promise<boolean> | boolean
}

const json = (route: Route, body: unknown, status = 200) => route.fulfill({
  status,
  contentType: 'application/json; charset=utf-8',
  body: JSON.stringify(body),
})

/** Install deterministic API responses before navigation. Nothing reaches the real API. */
export async function installApiMock(page: Page, options: MockOptions = {}) {
  await page.route('**/washjoy/api/**', async (route) => {
    if (await options.onApiRequest?.(route)) return
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace(/^\/washjoy\/api\/?/, '')
    if (path === 'public-data') return json(route, { pois: places }, options.publicDataStatus ?? 200)
    if (path === 'auth/me') return options.session ? json(route, options.session) : json(route, { error: '未登录' }, 401)
    if (path === 'reviews' && request.method() === 'GET') return json(route, { reviews: [] })
    if (path === 'reviews/mine' && request.method() === 'GET') return json(route, { reviews: [] })
    if (path === 'reviews' && request.method() === 'POST') return json(route, options.reviewStatus === 401 ? { error: '未登录' } : { error: '评价服务暂不可用' }, options.reviewStatus ?? 503)
    if (path.startsWith('admin/places') && request.method() === 'GET') return json(route, { places: [places[0]] })
    if (path.startsWith('admin/trash')) return json(route, { places: [] })
    if (path.startsWith('admin/reviews')) return json(route, { reviews: [] })
    if (path.startsWith('admin/places') && request.method() === 'PUT') return json(route, { error: '保存失败，请稍后重试' }, options.saveStatus ?? 503)
    if (path === 'auth/login' || path === 'auth/register') return json(route, { error: '认证服务暂不可用' }, 503)
    return json(route, { error: `Unexpected API request: ${path}` }, 500)
  })
}

export function watchBrowserIntegrity(page: Page) {
  const pageErrors: string[] = []
  const failedResources: string[] = []
  page.on('pageerror', error => pageErrors.push(error.message))
  page.on('response', response => {
    if (response.status() >= 400 && ['script', 'stylesheet'].includes(response.request().resourceType())) failedResources.push(`${response.status()} ${response.url()}`)
  })
  return {
    async expectClean() {
      expect(failedResources, failedResources.join('\n')).toEqual([])
      expect(pageErrors, pageErrors.join('\n')).toEqual([])
    },
  }
}

/**
 * The production build loads the AMap SDK through a script element. This stub is
 * intentionally only used by tests with VITE_AMAP_KEY=test; it never replaces
 * the external provider in a production browser.
 */
export async function installAMapSdk(page: Page, { failGeolocation = false, failSdk = false, routeTimes = { transit: 600, bike: 600, car: 600 } }: {
  failGeolocation?: boolean
  failSdk?: boolean
  routeTimes?: { transit: number; bike: number; car: number }
} = {}) {
  await page.addInitScript(({ shouldFail, shouldFailSdk, times }) => {
    if (shouldFailSdk) {
      // loadAMap 会检查这个标记并立即 reject
      ;(window as Window & { __amapFailFast?: boolean }).__amapFailFast = true
      return
    }
    class Point { lng: number; lat: number; constructor(lng: number, lat: number) { this.lng = lng; this.lat = lat } }
    const state = { mapsCreated: 0, mapsDestroyed: 0, calls: { transit: 0, bike: 0, car: 0 }, visibleCount: 1000 }
    const testWindow = window as unknown as { __amapTest: typeof state & { setVisibleCount(count: number, event?: string): void } }
    class Marker {
      element: HTMLElement
      constructor(options: { content?: string }) {
        this.element = document.createElement('div')
        this.element.className = 'amap-marker'
        this.element.innerHTML = options.content ?? ''
      }
    }
    const instances: Map[] = []
    class Map {
      host: HTMLElement
      listeners: Record<string, Set<() => void>> = {}
      constructor(host: HTMLElement, _options: unknown) { this.host = host; state.mapsCreated++; instances.push(this) }
      remove(markers: Marker | Marker[]) { for (const marker of Array.isArray(markers) ? markers : [markers]) marker.element.remove() }
      add(markers: Marker | Marker[]) { for (const marker of Array.isArray(markers) ? markers : [markers]) this.host.appendChild(marker.element) }
      getBounds() { return { contains: ([lng]: [number, number]) => lng <= 118.7969 + (state.visibleCount - 0.5) * 0.0001 } }
      on(event: string, listener: () => void) { (this.listeners[event] ??= new Set()).add(listener) }
      off(event: string, listener: () => void) { this.listeners[event]?.delete(listener) }
      emit(event: string) { this.listeners[event]?.forEach(listener => listener()) }
      setZoomAndCenter(_zoom: number, _center: unknown) { this.emit('moveend') }
      destroy() { state.mapsDestroyed++; this.host.replaceChildren() }
    }
    testWindow.__amapTest = Object.assign(state, { setVisibleCount(count: number, event = 'moveend') { state.visibleCount = count; instances.forEach(map => map.emit(event)) } })
    class Geolocation {
      getCurrentPosition(callback: (status: string, result: unknown) => void) {
        callback(shouldFail ? 'error' : 'complete', shouldFail ? { message: 'permission denied' } : { position: { lng: 118.7969, lat: 32.0603 }, location_type: 'gps', city: '南京市' })
      }
    }
    class CitySearch { getLocalCity(callback: (status: string, result: unknown) => void) { callback('complete', { city: '南京市', bounds: { getCenter: () => ({ lng: 118.7969, lat: 32.0603 }) } }) } }
    class Driving { search(_a: unknown, _b: unknown, callback: (status: string, result: unknown) => void) { state.calls.car++; callback('complete', { routes: [{ time: times.car }] }) } }
    class Riding { search(_a: unknown, _b: unknown, callback: (status: string, result: unknown) => void) { state.calls.bike++; callback('complete', { routes: [{ time: times.bike }] }) } }
    class Transfer { search(_a: unknown, _b: unknown, callback: (status: string, result: unknown) => void) { state.calls.transit++; callback('complete', { plans: [{ time: times.transit }] }) } }
    class PlaceSearch { search(_words: string, callback: (status: string, result: unknown) => void) { callback('complete', { poiList: { pois: [] } }) } }
    const sdk = { Map, Marker, Geolocation, CitySearch, Driving, Riding, Transfer, PlaceSearch, LngLat: Point, plugin: (_plugins: string[], done: () => void) => done() }
    const originalAppend = Element.prototype.appendChild
    const append = function (this: Element, node: Node): Node {
      if (node instanceof HTMLScriptElement && node.src.includes('webapi.amap.com/maps')) {
        const testWindow = window as unknown as { AMap?: unknown; ___onAPILoaded?: (error?: unknown) => void }
        testWindow.AMap = sdk
        queueMicrotask(() => testWindow.___onAPILoaded?.())
        return node
      }
      return originalAppend.call(this, node)
    }
    Element.prototype.appendChild = append as typeof Element.prototype.appendChild
  }, { shouldFail: failGeolocation, shouldFailSdk: failSdk, times: routeTimes })
}

export async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
}

export async function expectTouchTarget(locator: import('@playwright/test').Locator) {
  const box = await locator.boundingBox()
  expect(box).not.toBeNull()
  expect(Math.min(box!.width, box!.height)).toBeGreaterThanOrEqual(44)
}
