import type { TravelMode } from './travel-mode'

// 江苏 13 市及上海，按地理位置西北-东南排列
export const cityDatasets = [
  { id: 'nanjing', name: '南京市', center: [118.7969, 32.0603] as [number, number] },
  { id: 'yangzhou', name: '扬州市', center: [119.4129, 32.3942] as [number, number] },
  { id: 'taizhou', name: '泰州市', center: [120.0155, 32.2683] as [number, number] },
  { id: 'zhenjiang', name: '镇江市', center: [119.4525, 32.2044] as [number, number] },
  { id: 'changzhou', name: '常州市', center: [119.9965, 31.7683] as [number, number] },
  { id: 'wuxi', name: '无锡市', center: [120.3057, 31.5683] as [number, number] },
  { id: 'suzhou', name: '苏州市', center: [120.5954, 31.2989] as [number, number] },
  { id: 'kunshan', name: '昆山市', center: [120.9645, 31.3939] as [number, number] },
  { id: 'shanghai', name: '上海市', center: [121.4737, 31.2304] as [number, number] },
  { id: 'nantong', name: '南通市', center: [120.8955, 32.0000] as [number, number] },
  { id: 'xuzhou', name: '徐州市', center: [117.1205, 34.2658] as [number, number] },
  { id: 'lianyungang', name: '连云港市', center: [119.1765, 34.5997] as [number, number] },
  { id: 'suqian', name: '宿迁市', center: [118.2965, 33.9598] as [number, number] },
  { id: 'huaian', name: '淮安市', center: [119.0204, 32.6447] as [number, number] },
]

export type LocationFix = {
  latitude: number
  longitude: number
  city: string
  precise: boolean
}

type AMapPoint = { lat: number; lng: number }
type AMapLocationResult = { position?: AMapPoint; location_type?: string; message?: string; info?: string; addressComponent?: { city?: string | string[]; province?: string }; city?: string }
type AMapCityResult = { city?: string; bounds?: { getCenter(): AMapPoint } }
export type AMapRouteResult = { routes?: Array<{ time?: number }>; plans?: Array<{ time?: number }> }
type RouteSearch = { search(origin: unknown, destination: unknown, callback: (status: string, result: AMapRouteResult) => void): void }

export type AMapMarker = object
export type AMapSdk = {
  Map: new (host: HTMLElement, options: { zoom: number; center: [number, number]; viewMode: string; mapStyle: string; resizeEnable: boolean }) => { remove(marker: AMapMarker | AMapMarker[]): void; add(marker: AMapMarker | AMapMarker[]): void; setZoomAndCenter(zoom: number, center: [number, number], immediately?: boolean): void; destroy(): void }
  Marker: new (options: { position: [number, number]; title?: string; anchor: string; content: string; zIndex?: number }) => AMapMarker
  Geolocation: new (options: { enableHighAccuracy: boolean; timeout: number; maximumAge: number; convert: boolean; needAddress: boolean; extensions: string }) => { getCurrentPosition(callback: (status: string, result: AMapLocationResult) => void): void }
  CitySearch: new () => { getLocalCity(callback: (status: string, result: AMapCityResult) => void): void }
  Driving: new () => RouteSearch
  Riding: new () => RouteSearch
  Transfer: new (options: { city: string }) => RouteSearch
  LngLat: new (longitude: number, latitude: number) => unknown
  PlaceSearch: new (options: { city: string; pageSize: number }) => { search(keywords: string, callback: (status: string, result: unknown) => void): void }
}
let sdkPromise: Promise<AMapSdk> | null = null

export function loadAMap(): Promise<AMapSdk> {
  const key = import.meta.env.VITE_AMAP_KEY as string | undefined
  const securityCode = import.meta.env.VITE_AMAP_SECURITY_CODE as string | undefined
  if (!key) return Promise.reject(new Error('missing-amap-key'))
  // 测试可设置 window.__amapFailFast = true 让地图立即失败（模拟 SDK 加载失败）
  if ((window as Window & { __amapFailFast?: boolean }).__amapFailFast) {
    return Promise.reject(new Error('amap-fail-fast'))
  }
  if (!sdkPromise) {
    if (securityCode) (window as Window & { _AMapSecurityConfig?: { securityJsCode: string } })._AMapSecurityConfig = { securityJsCode: securityCode }
    sdkPromise = Promise.race([
      import('@amap/amap-jsapi-loader')
        .then(({ default: loader }) => loader.load({ key, version: '2.0', plugins: ['AMap.Scale', 'AMap.Geolocation', 'AMap.CitySearch', 'AMap.Driving', 'AMap.Riding', 'AMap.Transfer', 'AMap.PlaceSearch'] })),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('amap-load-timeout')), 3000)),
    ]).catch((error) => { sdkPromise = null; throw error })
  }
  return sdkPromise
}

function cityOf(result: AMapLocationResult): string {
  const component = result?.addressComponent
  const city = component?.city
  return (Array.isArray(city) ? city[0] : city) || component?.province || result?.city || ''
}

// 先用高德定位（浏览器定位，失败后自动退到 IP 定位），再退到 IP 城市查询。
export async function locate(): Promise<LocationFix> {
  const sdk = await loadAMap()
  try {
    return await new Promise<LocationFix>((resolve, reject) => {
      const geolocation = new sdk.Geolocation({ enableHighAccuracy: false, timeout: 10000, maximumAge: 60000, convert: true, needAddress: true, extensions: 'base' })
      geolocation.getCurrentPosition((status, result) => {
        if (status !== 'complete' || !result?.position) { reject(new Error(result?.message || result?.info || 'geolocation-failed')); return }
        resolve({
          latitude: result.position.lat, longitude: result.position.lng,
          city: cityOf(result) || '', precise: result.location_type !== 'ip' && !/ip/i.test(String(result.location_type || '')),
        })
      })
    })
  } catch (geoError) {
    return new Promise<LocationFix>((resolve, reject) => {
      new sdk.CitySearch().getLocalCity((status, result) => {
        if (status !== 'complete' || !result?.city || !result?.bounds) { reject(geoError); return }
        const center = result.bounds.getCenter()
        resolve({ latitude: center.lat, longitude: center.lng, city: String(result.city), precise: false })
      })
    })
  }
}

// JS SDK 使用 time（秒），并非 Web Service 的 duration 字段。
export function routeDurationFromResult(mode: TravelMode, result: AMapRouteResult): number | null {
  const routes = mode === 'transit' ? result?.plans : result?.routes
  const times = routes?.map((route) => route.time).filter((time): time is number => typeof time === 'number' && Number.isFinite(time) && time >= 0)
  return times?.length ? Math.min(...times) : null
}

export async function getRouteDuration(mode: TravelMode, city: string, origin: [number, number], destination: [number, number], signal?: AbortSignal): Promise<number | null> {
  try {
    if (signal?.aborted) return null
    const sdk = await loadAMap()
    if (signal?.aborted) return null
    return await new Promise<number | null>((resolve) => {
      const finish = (duration: number | null) => {
        clearTimeout(timeout)
        resolve(duration)
      }
      // SDK cannot cancel transport: retain the slot until response/timeout.
      const timeout = setTimeout(() => finish(null), 10000)
      const planner = mode === 'transit' ? new sdk.Transfer({ city }) : mode === 'bike' ? new sdk.Riding() : new sdk.Driving()
      planner.search(new sdk.LngLat(...origin), new sdk.LngLat(...destination), (status, result) => {
        finish(!signal?.aborted && status === 'complete' ? routeDurationFromResult(mode, result) : null)
      })
    })
  } catch {
    return null
  }
}

export function getDrivingDuration(origin: [number, number], destination: [number, number]): Promise<number | null> {
  return getRouteDuration('car', '', origin, destination)
}

// POI 评价数据类型
export type PoiReview = {
  rating: number
  ratingCount: number
  averageRating?: number
  comments?: string[]
}

type PoiSearchResult = { poiList?: { pois?: Array<{ biz_info?: { overall_rating?: unknown; comment_count?: unknown }; rating?: unknown }> } }

function poiSearchResult(value: unknown): PoiSearchResult | undefined {
  return typeof value === 'object' && value !== null ? value as PoiSearchResult : undefined
}

// 从高德地图获取商户 POI 评价（通过搜索 API 获取评分和评价数）
export async function getPoiReviews(keywords: string, city: string): Promise<PoiReview | null> {
  try {
    const sdk = await loadAMap()
    return await new Promise<PoiReview | null>((resolve) => {
      // PlaceSearch 搜索商户信息
      const placeSearch = new sdk.PlaceSearch({ city, pageSize: 1 })
      const timeout = window.setTimeout(() => resolve(null), 10000)
      placeSearch.search(keywords, (status, result) => {
        window.clearTimeout(timeout)
        const poi = poiSearchResult(result)?.poiList?.pois?.[0]
        if (status === 'complete' && poi) {
          // 高德 POI 包含 biz_info 中的评分和评价计数
          const rating = poi?.biz_info?.overall_rating || poi?.rating || 0
          const ratingCount = poi?.biz_info?.comment_count || 0
          resolve({
            rating: Number(rating) || 0,
            ratingCount: Number(ratingCount) || 0,
            averageRating: Number(rating) || 0,
          })
        } else {
          resolve(null)
        }
      })
    })
  } catch {
    return null
  }
}
