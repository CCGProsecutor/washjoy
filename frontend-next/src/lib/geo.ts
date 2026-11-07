export function distanceInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radians = (value: number) => value * Math.PI / 180
  const dLat = radians(lat2 - lat1)
  const dLon = radians(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// 1 公里内显示米，其余显示公里（一位小数）。
export function formatDistance(km: number | null | undefined): string {
  if (km == null || !Number.isFinite(km)) return ''
  if (km < 1) return `${Math.max(10, Math.round(km * 100) * 10)} m`
  return `${km.toFixed(1)} km`
}
