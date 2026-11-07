import { Button } from '@heroui/react'
import { Bath, Heart, ImageOff, RotateCcw, Star } from 'lucide-react'
import { useState } from 'react'
import type { Place } from '../lib/api'
import { formatDistance } from '../lib/geo'

/** Real venue content. Missing/failed photos never use a generated venue substitute. */
export function PlaceCard({ place, distance, saved, onOpen, onToggleSaved, priority = false }: {
  place: Place; distance: number | null; saved: boolean; onOpen: (place: Place) => void;
  onToggleSaved: (place: Place) => void; priority?: boolean;
}) {
  const [failed, setFailed] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const unavailable = !place.image || failed === place.image
  return <article className="wj-venue-card wj-motion-enter" aria-label={place.name}>
    <div className="wj-venue-cover">
      <button type="button" className="wj-venue-image" aria-label={`查看${place.name}详情`} onClick={() => onOpen(place)}>
        {unavailable ? <span className="wj-venue-placeholder" role="img" aria-label={`${place.name}，图片暂不可用`}>
          {place.image ? <ImageOff size={28} strokeWidth={1.4} /> : <Bath size={32} strokeWidth={1.2} />}
          <span>{place.image ? '图片暂时未能加载' : '门店尚未提供照片'}</span>
        </span> : <img key={`${place.image}:${attempt}`} src={place.image} alt={`${place.name}门店图片`} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} decoding="async" onError={() => setFailed(place.image || null)} />}
      </button>
      {place.recommended && <span className="wj-venue-badge"><Star size={13} fill="currentColor" />站长推荐</span>}
      <Button isIconOnly variant="ghost" className={`wj-venue-heart${saved ? ' is-saved' : ''}`} aria-label={`${saved ? '取消收藏' : '收藏'}${place.name}`} aria-pressed={saved} onPress={() => onToggleSaved(place)}><Heart size={22} fill={saved ? 'currentColor' : 'none'} /></Button>
      {unavailable && place.image && <Button variant="ghost" className="wj-venue-image-retry" aria-label={`重试${place.name}图片`} onPress={() => { setAttempt(value => value + 1); setFailed(null) }}><RotateCcw size={14} />重试图片</Button>}
    </div>
    <div className="wj-venue-caption">
      <h2><button type="button" onClick={() => onOpen(place)}>{place.name}</button></h2>
      {place.score !== undefined ? <span className="wj-venue-score"><Star size={16} fill="currentColor" /><span>{place.score.toFixed(1)}</span><span className="wj-sr-only">分</span></span> : <span className="wj-venue-unrated">暂无评分</span>}
      <p>{[place.category, formatDistance(distance)].filter(Boolean).join(' · ')}</p>
    </div>
  </article>
}
