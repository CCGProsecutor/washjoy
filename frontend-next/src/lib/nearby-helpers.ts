export const PAGE_SIZE = 30

export type Coordinates = { latitude: number; longitude: number }
export type CityFallback = { name: string; center: [number, number] }
export type RouteCandidate = { latitude?: number; longitude?: number }

export function fallbackLocation(city: CityFallback) {
  return { latitude: city.center[1], longitude: city.center[0], city: city.name, precise: false }
}

// 路线时间与出发点绑定；相同门店在不同位置的记录不能复用。
export function routeCacheKey(origin: Coordinates, placeId: string) {
  return `${origin.longitude.toFixed(5)},${origin.latitude.toFixed(5)}:${placeId}`
}

export function routeCandidates<T extends RouteCandidate>(items: readonly T[]) {
  return items.filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude) && Math.abs(item.latitude!) <= 90 && Math.abs(item.longitude!) <= 180)
}
