import { Modal } from '@heroui/react'
import { useReducedMotion } from 'motion/react'
import { Clock, Clock3, Heart, MapPin, MessageSquareText, Navigation, Phone, RotateCw, Star, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { formatPrice, type Place } from '../lib/api'
import { getPoiReviews } from '../lib/amap'
import { getDrivingDuration } from '../lib/amap'
import { formatDistance } from '../lib/geo'
import { placeContent } from '../lib/place-content'
import type { TravelMode } from './home-sheet'
import { PlaceCarousel } from './place-carousel'
import { PlaceReviews, type ReviewsHandle } from './place-reviews'
import { Button } from './ui/button'
import { Icon } from './ui/icon'

const uriMode: Record<TravelMode, string> = { transit: 'bus', bike: 'ride', car: 'car' }

// 格式化时间（秒转分钟）
function formatDuration(seconds: number | null): string {
  if (!seconds) return ''
  const minutes = Math.round(seconds / 60)
  if (minutes < 1) return '< 1 分钟'
  return `${minutes} 分钟`
}

function routeUrl(place: Place, mode: TravelMode, from: { latitude: number; longitude: number } | null) {
  if (!place.longitude || !place.latitude) return `https://uri.amap.com/search?keyword=${encodeURIComponent(`${place.name} ${place.address}`)}`
  const origin = from ? `&from=${from.longitude},${from.latitude},${encodeURIComponent('我的位置')}` : ''
  return `https://uri.amap.com/navigation?to=${place.longitude},${place.latitude},${encodeURIComponent(place.name)}${origin}&mode=${uriMode[mode]}&policy=1&src=washjoy`
}

type Props = { place: Place | null; onClose: () => void; container: HTMLElement | null; datasetName: string; distance: number | null; user: { latitude: number; longitude: number } | null; travelMode: TravelMode; signedIn: boolean; saved: boolean; onToggleSaved: (place: Place) => void }

// 详情弹出卡片：从底部升起，下拉或点遮罩关闭；桌面端居中显示。
export function PlaceDetail({ place, onClose, datasetName, distance, user, travelMode, signedIn, saved, onToggleSaved }: Props) {
  const reduced = useReducedMotion()
  const surface = useRef<HTMLDivElement | null>(null)
  const sheetAnimation = useRef<Animation | null>(null)
  const sheetFrame = useRef<number | null>(null)
  const closing = useRef(false)
  const closeCallback = useRef(onClose)
  useEffect(() => { closeCallback.current = onClose }, [onClose])
  const attachSurface = useCallback((anchor: HTMLSpanElement | null) => {
    const node = anchor?.closest<HTMLDivElement>('.wj-detail') ?? null
    if (sheetFrame.current !== null) cancelAnimationFrame(sheetFrame.current)
    sheetAnimation.current?.cancel()
    sheetAnimation.current = null
    surface.current = node
    closing.current = false
    if (!node || reduced) return
    node.style.opacity = '0'
    sheetFrame.current = requestAnimationFrame(() => {
      // Complete viewport/scroll-lock layout before the compositor is started.
      node.getBoundingClientRect()
      const frames = [{ transform: 'translateY(28px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }]
      sheetFrame.current = requestAnimationFrame(() => {
        sheetFrame.current = null
        if (surface.current !== node || closing.current) return
        sheetAnimation.current = node.animate(frames, { duration: 250, easing: 'cubic-bezier(0.23,1,0.32,1)' })
        node.style.opacity = '1'
      })
    })
  }, [reduced])
  useEffect(() => {
    if (!place || !closing.current) return
    if (sheetFrame.current !== null) cancelAnimationFrame(sheetFrame.current)
    sheetAnimation.current?.cancel()
    closing.current = false
    if (surface.current) { surface.current.style.opacity = '1'; surface.current.style.transform = 'none' }
  }, [place])
  function requestClose() {
    if (closing.current) return
    closing.current = true
    if (sheetFrame.current !== null) cancelAnimationFrame(sheetFrame.current)
    const node = surface.current
    if (!node || reduced) { closeCallback.current(); return }
    const style = getComputedStyle(node)
    const frames = [{ transform: style.transform, opacity: style.opacity }, { transform: 'translateY(28px)', opacity: 0 }]
    node.style.transform = style.transform
    node.style.opacity = style.opacity
    sheetAnimation.current?.cancel()
    sheetFrame.current = requestAnimationFrame(() => {
      sheetFrame.current = null
      if (surface.current !== node || !closing.current) return
      const animation = node.animate(frames, { duration: 250, easing: 'cubic-bezier(0.23,1,0.32,1)', fill: 'forwards' })
      sheetAnimation.current = animation
      void animation.finished.then(() => { if (surface.current === node && closing.current) closeCallback.current() }).catch(() => {})
    })
  }
  const last = useRef<Place | null>(place)
  const [detail, setDetail] = useState<{ id: string; poi: Partial<Place> } | null>(null)
  const [travelDuration, setTravelDuration] = useState<number | null>(null)
  const [poiError, setPoiError] = useState(false)
  const [poiRequest, setPoiRequest] = useState(0)
  const reviews = useRef<ReviewsHandle>(null)

  useEffect(() => { if (place) last.current = place }, [place])
  const shown = place ?? last.current
  const displayPlace = shown && (detail?.id === shown.id ? { ...shown, ...detail.poi } : shown)
  const km = formatDistance(distance)
  const content = displayPlace ? placeContent(displayPlace) : { description: '', tags: [] }

  // 获取高德 POI 评价信息
  useEffect(() => {
    if (!shown) return
    let cancelled = false
    let settle: ReturnType<typeof setTimeout> | undefined
    setPoiError(false)

    const fetchPoiReviews = async () => {
      if (cancelled) return
      // The image viewer owns the screen; enrich hidden venue metadata afterward.
      if (document.querySelector('.wj-photo-dialog')) { settle = setTimeout(fetchPoiReviews, 200); return }
      try {
        const poiData = await getPoiReviews(shown.name, shown.city)
        const applyRating = () => {
          if (cancelled) return
          if (document.querySelector('.wj-photo-dialog')) { settle = setTimeout(applyRating, 200); return }
          if (poiData) setDetail({ id: shown.id, poi: { poiRating: poiData.averageRating, poiRatingCount: poiData.ratingCount } })
          else setPoiError(true)
        }
        if (!cancelled) applyRating()
      } catch {
        if (!cancelled) setPoiError(true)
      }
    }

    settle = setTimeout(fetchPoiReviews, 350)
    return () => { cancelled = true; if (settle) clearTimeout(settle) }
  }, [shown, poiRequest])

  // 获取交通工具到达时间
  useEffect(() => {
    if (!shown || !user || travelMode !== 'car' || !shown.latitude || !shown.longitude) {
      setTravelDuration(null)
      return
    }

    let cancelled = false

    const fetchTravelDuration = async () => {
      const duration = await getDrivingDuration([user.longitude, user.latitude], [shown.longitude!, shown.latitude!])
      if (!cancelled) {
        setTravelDuration(duration)
      }
    }

    void fetchTravelDuration()
    return () => { cancelled = true }
  }, [shown, user, travelMode])

  return (
    <Modal>
      <Modal.Backdrop isOpen={Boolean(place)} onOpenChange={(open) => { if (!open) requestClose() }} className="wj-detail-backdrop">
        <Modal.Container placement="bottom" scroll="inside" className="wj-detail-container">
          <Modal.Dialog className="wj-detail" aria-label={shown?.name}>
            <span ref={attachSurface} hidden aria-hidden="true" />
            {shown && displayPlace && (
              <>
                <Modal.Header className="wj-detail-header">
                  <div className="wj-detail-header-copy">
                    <p className="wj-footnote wj-accent">{displayPlace.category} · {datasetName}</p>
                    <Modal.Heading className="wj-title2">{displayPlace.name}</Modal.Heading>
                  </div>
                  <Modal.CloseTrigger className="wj-detail-close" aria-label="关闭门店详情"><Icon icon={X} size="md" /></Modal.CloseTrigger>
                </Modal.Header>
                <Modal.Body className="wj-detail-body">
                <PlaceCarousel images={displayPlace.images.length ? displayPlace.images : displayPlace.image ? [displayPlace.image] : []} label={displayPlace.name} fallback={displayPlace.category} />
                <div className="wj-detail-info">
                  <p className="wj-subhead wj-secondary wj-meta-line">
                    <span className="wj-rating"><Icon icon={Star} size="md" fill />{displayPlace.poiRating ? displayPlace.poiRating.toFixed(1) : displayPlace.score?.toFixed(1) ?? '新店'}</span>
                    {(displayPlace.poiRatingCount ?? 0) > 0 && <span className="wj-caption wj-secondary">({displayPlace.poiRatingCount} 条评价)</span>}
                    {travelDuration && travelMode === 'car' && <span className="wj-travel-time"><Icon icon={Clock} size="md" />{formatDuration(travelDuration)}</span>}
                    {!travelDuration && km && <span>{km}</span>}
                    {formatPrice(displayPlace.price) && <span>人均 {formatPrice(displayPlace.price)}</span>}
                  </p>
                  {poiError && <p className="wj-detail-notice wj-footnote" role="status">评分信息暂不可用 <button type="button" onClick={() => setPoiRequest((current) => current + 1)}><Icon icon={RotateCw} size="md" />重试</button></p>}
                  <div className="wj-actions">
                    <Button variant="secondary" aria-pressed={saved} onClick={() => onToggleSaved(shown)}><Icon icon={Heart} size="md" fill={saved} />{saved ? '已收藏' : '收藏'}</Button>
                    <Button variant="secondary" onClick={() => reviews.current?.focusForm()}><Icon icon={MessageSquareText} size="md" />写评价</Button>
                    <a className="wj-btn wj-btn-primary" href={routeUrl(displayPlace, travelMode, user)} target="_blank" rel="noopener noreferrer"><Icon icon={Navigation} size="md" />路线</a>
                  </div>
                  <ul className="wj-info-list">
                    {displayPlace.address && <li><Icon icon={MapPin} size="md" className="wj-list-icon" /><span className="wj-subhead">{displayPlace.address}</span></li>}
                    {displayPlace.openTime && <li><Icon icon={Clock3} size="md" className="wj-list-icon" /><span className="wj-subhead">营业时间 {displayPlace.openTime}</span></li>}
                    {displayPlace.phone && <li><Icon icon={Phone} size="md" className="wj-list-icon" /><a className="wj-subhead wj-accent" href={`tel:${displayPlace.phone.split(/[;,]/)[0]}`}>{displayPlace.phone}</a></li>}
                  </ul>
                  {content.description && <section className="wj-place-description" aria-labelledby="wj-place-description-title"><h3 id="wj-place-description-title" className="wj-headline">门店介绍</h3><p className="wj-subhead">{content.description}</p></section>}
                  {content.tags.length > 0 && <section className="wj-place-services" aria-labelledby="wj-place-services-title"><h3 id="wj-place-services-title" className="wj-headline">特色服务</h3><ul className="wj-tags" aria-label="服务标签">{content.tags.map((tag) => <li key={tag} className="wj-tag wj-footnote">{tag}</li>)}</ul></section>}
                  <PlaceReviews ref={reviews} place={shown} signedIn={signedIn} />
                </div>
                </Modal.Body>
              </>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
