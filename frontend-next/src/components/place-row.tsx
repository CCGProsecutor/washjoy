import { Star, ArrowUpRight } from 'lucide-react'
import { useState } from 'react'
import type { Place } from '../lib/api'
import { formatDistance } from '../lib/geo'
import { Icon } from './ui/icon'

export function PlaceRow({ place, index, distance, onOpen }: { place: Place; index: number; distance: number | null; onOpen: (place: Place) => void }) {
  const [failedImage, setFailedImage] = useState<string | undefined>()
  const meta = [place.category, formatDistance(distance)].filter(Boolean).join(' · ')
  return <button type="button" className="wj-row" onClick={() => onOpen(place)}>
    <span className="wj-row-thumb">
      {place.image && failedImage !== place.image ? <img src={place.image} alt="" loading="lazy" decoding="async" onError={() => setFailedImage(place.image)} /> : <span className="wj-row-fallback">{place.category.slice(0, 2)}</span>}
      <span className="wj-row-index wj-caption">{index + 1}</span>
    </span>
    <span className="wj-row-body">
      <span className="wj-headline wj-clamp-2">{place.name}</span>
      <span className="wj-footnote wj-secondary wj-clamp-1">{place.address || place.category}</span>
      <span className="wj-footnote wj-row-meta"><span className="wj-row-rating"><Icon icon={Star} size="sm" fill />{place.score?.toFixed(1) ?? '暂无评分'}</span><span className="wj-secondary">{meta}</span></span>
    </span><ArrowUpRight size={16} className="wj-row-arrow" aria-hidden="true" />
  </button>
}
