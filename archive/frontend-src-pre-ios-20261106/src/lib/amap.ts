export const cityDatasets = [
  { id: 'nanjing', name: '南京市', center: [118.7969, 32.0603] as [number, number] },
  { id: 'zhenjiang', name: '镇江市', center: [119.4525, 32.2044] as [number, number] },
  { id: 'yangzhou', name: '扬州市', center: [119.4129, 32.3942] as [number, number] },
]

export type LocationFix = {
  latitude: number
  longitude: number
  city: string
  precise: boolean
}

type AMapSdk = any
let sdkPromise: Promise<AMapSdk> | null = null

export function loadAMap(): Promise<AMapSdk> {
  const key = import.meta.env.VITE_AMAP_KEY as string | undefined
  const securityCode = import.meta.env.VITE_AMAP_SECURITY_CODE as string | undefined
  if (!key) return Promise.reject(new Error('missing-amap-key'))
  if (!sdkPromise) {
    if (securityCode) (window as any)._AMapSecurityConfig = { securityJsCode: securityCode }
    sdkPromise = import('@amap/amap-jsapi-loader')
      .then(({ default: loader }) => loader.load({ key, version: '2.0', plugins: ['AMap.Scale', 'AMap.Geolocation', 'AMap.CitySearch'] }))
      .catch((error) => { sdkPromise = null; throw error })
  }
  return sdkPromise
}

function cityOf(result: any): string {
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
      geolocation.getCurrentPosition((status: string, result: any) => {
        if (status !== 'complete' || !result?.position) { reject(new Error(result?.message || result?.info || 'geolocation-failed')); return }
        resolve({
          latitude: result.position.lat, longitude: result.position.lng,
          city: cityOf(result) || '', precise: result.location_type !== 'ip' && !/ip/i.test(String(result.location_type || '')),
        })
      })
    })
  } catch (geoError) {
    return new Promise<LocationFix>((resolve, reject) => {
      new sdk.CitySearch().getLocalCity((status: string, result: any) => {
        if (status !== 'complete' || !result?.city || !result?.bounds) { reject(geoError); return }
        const center = result.bounds.getCenter()
        resolve({ latitude: center.lat, longitude: center.lng, city: String(result.city), precise: false })
      })
    })
  }
}
