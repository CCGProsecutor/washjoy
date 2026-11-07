import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Bath, Droplets, Footprints, ShowerHead, Store } from 'lucide-react'
import type { Place } from './api'
import type { MapBounds, ViewportMap } from './map-sdk-types'

type MarkerPlace = Pick<Place, 'id' | 'name' | 'category' | 'longitude' | 'latitude'>
const categoryIcons = { '洗浴中心': Bath, '足疗会所': Footprints, '大众澡堂': ShowerHead, '街边店': Store, '私汤': Droplets }

export function markerContent(place: MarkerPlace): string {
  const Icon = categoryIcons[place.category as keyof typeof categoryIcons] ?? Bath
  // React escapes both text and attributes before AMap inserts this HTML.
  return renderToStaticMarkup(createElement('button', {
    type: 'button', className: 'wj-pin', 'data-place-id': place.id,
    'data-category': place.category, 'aria-label': `${place.name}，${place.category}`, title: place.name,
  }, createElement(Icon, { size: 22, strokeWidth: 2, 'aria-hidden': true }), createElement('span', { className: 'wj-pin-name' }, place.name)))
}

export function visibleMarkerIds(places: MarkerPlace[], bounds: MapBounds | undefined): Set<string> {
  return new Set(places.filter(place => Number.isFinite(place.longitude) && Number.isFinite(place.latitude)
    && bounds?.contains([place.longitude!, place.latitude!])).map(place => place.id))
}

export function updateMarkerNames(host: HTMLElement, places: MarkerPlace[], bounds: MapBounds | undefined): void {
  const visibleIds = visibleMarkerIds(places, bounds)
  host.querySelectorAll<HTMLElement>('.wj-pin').forEach(pin => {
    pin.classList.toggle('has-name', visibleIds.size < 10 && visibleIds.has(pin.dataset.placeId ?? ''))
  })
}

export function listenForViewport(map: ViewportMap, update: () => void): () => void {
  const events = ['moveend', 'zoomend', 'resize', 'complete'] as const
  events.forEach(event => map.on(event, update))
  update()
  let listening = true
  return () => {
    if (!listening) return
    listening = false
    events.forEach(event => map.off(event, update))
  }
}
