import type { AMapSdk } from './amap'

export type MapBounds = { contains(point: [number, number]): boolean }
export type MapViewportEvent = 'moveend' | 'zoomend' | 'resize' | 'complete'
export type ViewportMap = InstanceType<AMapSdk['Map']> & {
  getBounds(): MapBounds | undefined
  on(event: MapViewportEvent, callback: () => void): void
  off(event: MapViewportEvent, callback: () => void): void
}
