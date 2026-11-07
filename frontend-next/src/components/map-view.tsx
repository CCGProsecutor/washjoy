import { useEffect, useRef, useState } from 'react'
import { cityDatasets, loadAMap, type AMapMarker, type AMapSdk } from '../lib/amap'
import type { Place } from '../lib/api'
import { listenForViewport, markerContent, updateMarkerNames } from '../lib/map-marker-helpers'
import type { ViewportMap } from '../lib/map-sdk-types'

type Props = {
  places: Place[]
  selectedId: string | null
  user: { latitude: number; longitude: number } | null
  radiusKm: number
  center: [number, number]
  onSelect: (place: Place) => void
  onError: () => void
}

// 高德地图封装：只创建一次实例；标记、用户位置点、视野分别由独立 effect 更新。
export function MapView({ places, selectedId, user, radiusKm, center, onSelect, onError }: Props) {
  const mapRef = useRef<ViewportMap | null>(null)
  const sdkRef = useRef<AMapSdk | null>(null)
  const markersRef = useRef<AMapMarker[]>([])
  const viewportCleanupRef = useRef<(() => void) | null>(null)
  const userMarkerRef = useRef<AMapMarker | null>(null)
  const placesRef = useRef(places)
  const onSelectRef = useRef(onSelect)
  const onErrorRef = useRef(onError)
  const [ready, setReady] = useState(false)
  placesRef.current = places
  onSelectRef.current = onSelect
  onErrorRef.current = onError

  useEffect(() => {
    let disposed = false
    loadAMap().then((sdk) => {
      const host = document.getElementById('washjoy-map')
      if (disposed || !host) return
      sdkRef.current = sdk
      mapRef.current = new sdk.Map(host, { zoom: 12, center: cityDatasets[0].center, viewMode: '2D', mapStyle: 'amap://styles/normal', resizeEnable: true }) as ViewportMap
      setReady(true)
    }).catch(() => onErrorRef.current())
    return () => { disposed = true; viewportCleanupRef.current?.(); viewportCleanupRef.current = null; mapRef.current?.destroy(); mapRef.current = null; setReady(false) }
  }, [])

  useEffect(() => {
    const map = mapRef.current, sdk = sdkRef.current
    if (!ready || !map || !sdk) return
    map.remove(markersRef.current)
    markersRef.current = places.flatMap((place) => {
      if (!Number.isFinite(place.longitude) || !Number.isFinite(place.latitude)) return []
      return [new sdk.Marker({ position: [place.longitude!, place.latitude!], title: place.name, anchor: 'center', content: markerContent(place) })]
    })
    map.add(markersRef.current)
    const host = document.getElementById('washjoy-map')
    if (!host) return
    const cleanup = listenForViewport(map, () => updateMarkerNames(host, places, map.getBounds()))
    viewportCleanupRef.current = cleanup
    return () => { cleanup(); if (viewportCleanupRef.current === cleanup) viewportCleanupRef.current = null }
  }, [ready, places])

  useEffect(() => {
    document.querySelectorAll('#washjoy-map .wj-pin').forEach((pin) => pin.classList.toggle('is-selected', (pin as HTMLElement).dataset.placeId === selectedId))
  }, [selectedId, places, ready])

  useEffect(() => {
    const map = mapRef.current, sdk = sdkRef.current
    if (!ready || !map || !sdk) return
    if (userMarkerRef.current) { map.remove(userMarkerRef.current); userMarkerRef.current = null }
    if (user) {
      userMarkerRef.current = new sdk.Marker({ position: [user.longitude, user.latitude], content: '<span class="wj-user-dot"></span>', anchor: 'center', zIndex: 200 })
      map.add(userMarkerRef.current)
      map.setZoomAndCenter(radiusKm === 0 ? 12 : radiusKm <= 3 ? 14 : radiusKm <= 5 ? 13 : 12, [user.longitude, user.latitude], true)
    } else map.setZoomAndCenter(12, center, true)
  }, [ready, user, radiusKm, center])

  // 高德在触屏上会接管触摸事件，标记自带的 click 在手机上常不触发。
  // 在地图容器上用捕获阶段的指针事件自己判断"点按"：按下和抬起距离不超过 10px。
  useEffect(() => {
    const host = document.getElementById('washjoy-map')
    if (!host) return
    let start: { x: number; y: number; id: string } | null = null
    const down = (event: PointerEvent) => {
      const pin = (event.target as Element | null)?.closest?.('.wj-pin') as HTMLElement | null
      start = pin?.dataset.placeId ? { x: event.clientX, y: event.clientY, id: pin.dataset.placeId } : null
    }
    const up = (event: PointerEvent) => {
      if (!start) return
      const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y)
      const id = start.id
      start = null
      if (moved > 10) return
      const place = placesRef.current.find((item) => item.id === id)
      if (place) onSelectRef.current(place)
    }
    const cancel = () => { start = null }
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      const pin = (event.target as Element | null)?.closest?.('.wj-pin') as HTMLElement | null
      if (!pin?.dataset.placeId) return
      event.preventDefault()
      const place = placesRef.current.find(item => item.id === pin.dataset.placeId)
      if (place) onSelectRef.current(place)
    }
    host.addEventListener('keydown', keydown, true)
    host.addEventListener('pointerdown', down, true)
    window.addEventListener('pointerup', up, true)
    window.addEventListener('pointercancel', cancel, true)
    return () => { host.removeEventListener('keydown', keydown, true); host.removeEventListener('pointerdown', down, true); window.removeEventListener('pointerup', up, true); window.removeEventListener('pointercancel', cancel, true) }
  }, [])

  return <div id="washjoy-map" className="wj-map" role="application" aria-label="地图" />
}
