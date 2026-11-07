import { Pause, Play, ZoomIn } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { Icon } from './ui/icon'
import { PhotoLightbox } from './photo-lightbox'

// 图片轮播：原生滚动吸附（手势和惯性由浏览器负责），每 4 秒自动翻页；触摸、悬停、聚焦时暂停。
// 开启“减少动态效果”时不自动播放。失败图片不会占据一个空白滑页。
export function PlaceCarousel({ images, label, fallback }: { images: string[]; label: string; fallback: string }) {
  const track = useRef<HTMLDivElement>(null)
  const pendingOpen = useRef<number | null>(null)
  useEffect(() => () => {
    if (pendingOpen.current !== null) cancelAnimationFrame(pendingOpen.current)
  }, [])
  const reduced = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [manualPause, setManualPause] = useState(false)
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    const update = () => setHidden(document.hidden)
    update(); document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])
  const [failed, setFailed] = useState<Record<string, boolean>>({})
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number; source: HTMLButtonElement } | null>(null)
  const [offscreen, setOffscreen] = useState(false)
  useEffect(() => {
    const el = track.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => setOffscreen(!entry.isIntersecting))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  const shown = images.filter((src) => !failed[src])
  const hasFailedImage = images.length > shown.length

  useEffect(() => {
    if (shown.length < 2 || paused || manualPause || hidden || offscreen || lightbox !== null || reduced) return
    const timer = window.setInterval(() => {
      const el = track.current
      if (!el) return
      const next = (Math.round(el.scrollLeft / el.clientWidth) + 1) % shown.length
      el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' })
    }, 4000)
    return () => window.clearInterval(timer)
  }, [shown.length, paused, manualPause, hidden, offscreen, lightbox, reduced])

  if (shown.length === 0) return <div className="wj-hero wj-hero-fallback" role="img" aria-label={`${label}，图片暂不可用`}><span>{fallback}</span></div>

  return (
    <div className="wj-hero" onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div ref={track} className="wj-hero-track" onPointerDown={() => setPaused(true)} onPointerUp={() => setPaused(false)} onScroll={(event) => { const el = event.currentTarget; setIndex(Math.round(el.scrollLeft / el.clientWidth)) }} tabIndex={0} role="group" aria-roledescription="轮播" aria-label={`${label} 图片`}>
        {shown.map((src, position) => (
          <button key={src} className="wj-hero-image-button" type="button" onClick={event => {
            // The full-screen viewer takes over the motion of the covered sheet.
            const surfaces = [event.currentTarget.closest('.wj-detail-container'), document.querySelector('.wj-detail-backdrop')]
            surfaces.forEach(surface => surface?.getAnimations({ subtree: true }).forEach(animation => {
              if ((animation instanceof CSSAnimation || animation instanceof CSSTransition) && animation.effect?.getTiming().iterations !== Infinity) {
                try { animation.finish() } catch { /* A cancelled transition already settled. */ }
              }
            }))
            const nextLightbox = { images: [...shown], index: position, source: event.currentTarget }
            if (pendingOpen.current !== null) cancelAnimationFrame(pendingOpen.current)
            // Settle the outgoing surface before mounting the next modal tree.
            pendingOpen.current = requestAnimationFrame(() => {
              pendingOpen.current = null
              if (nextLightbox.source.isConnected && !nextLightbox.source.closest('[data-exiting]') && !document.querySelector('.wj-detail-backdrop[data-exiting]')) setLightbox(nextLightbox)
            })
          }} aria-label={`放大查看 ${label} 图片 ${position + 1}，共 ${shown.length} 张`}>
            <img src={src} alt={`${label} ${position + 1}`} loading={position === 0 ? 'eager' : 'lazy'} decoding="async" draggable={false} onError={() => setFailed((current) => ({ ...current, [src]: true }))} />
            <span className="wj-hero-zoom" aria-hidden="true"><Icon icon={ZoomIn} size="sm" /></span>
          </button>
        ))}
      </div>
      {shown.length > 1 && !reduced && <button className="wj-carousel-pause" type="button" aria-label={manualPause ? '播放图片轮播' : '暂停图片轮播'} onClick={() => setManualPause(value => !value)}><Icon icon={manualPause ? Play : Pause} size="sm" /></button>}
      {shown.length > 1 && <span className="wj-hero-count wj-caption" aria-hidden="true">{Math.min(index + 1, shown.length)} / {shown.length}</span>}
      {hasFailedImage && <span className="wj-hero-image-error wj-footnote" role="status">部分门店图片加载失败</span>}
      {lightbox && <PhotoLightbox images={lightbox.images} initialIndex={lightbox.index} source={lightbox.source} label={label} onClose={() => {
        if (pendingOpen.current !== null) cancelAnimationFrame(pendingOpen.current)
        pendingOpen.current = null
        setLightbox(null)
      }} />}
    </div>
  )
}
