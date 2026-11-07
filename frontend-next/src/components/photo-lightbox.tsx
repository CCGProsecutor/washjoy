import { Modal } from '@heroui/react'
import { ChevronLeft, ChevronRight, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react'
import { spring, useMotionValue, useReducedMotion, motion } from 'motion/react'
import { useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'
import '../styles/lightbox.css'

type Point = { x: number; y: number }
type PhotoLightboxProps = {
  images: string[]
  initialIndex: number
  label: string
  source: HTMLButtonElement | null
  onClose: () => void
}
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const zoomSpring = spring({ keyframes: [0, 1], duration: 300, bounce: 0 })
const zoomProgress = Array.from({ length: 31 }, (_, index) => index === 30 ? 1 : zoomSpring.next(index * 10).value)

let pendingFocusRestore: ReturnType<typeof setTimeout> | undefined

// HeroUI owns the modal stack, scroll lock, Escape handling and focus restoration.
// Gesture state stays in refs: pointer capture never turns a dragged image into a click.
export function PhotoLightbox(props: PhotoLightboxProps) {
  const requestClose = useRef<(() => void) | null>(null)
  const backdrop = useRef<HTMLDivElement>(null)
  return <Modal>
    <Modal.Backdrop ref={backdrop} isOpen isDismissable onOpenChange={open => { if (!open) requestClose.current?.() }} className="wj-photo-backdrop">
      <Modal.Container placement="center" className="wj-photo-container">
        <Modal.Dialog className="wj-photo-dialog" aria-label={`${props.label} 图片预览`}>
          <PhotoViewer {...props} closeRequest={requestClose} backdrop={backdrop} />
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  </Modal>
}

// Image/gesture updates must not rerender the modal shell: React Aria measures
// the page and visual viewport during each overlay render.
function PhotoViewer({ images, initialIndex, label, source, onClose, closeRequest, backdrop }: PhotoLightboxProps & {
  closeRequest: RefObject<(() => void) | null>
  backdrop: RefObject<HTMLDivElement | null>
}) {
  const reduced = useReducedMotion()
  const [index, setIndex] = useState(() => clamp(initialIndex, 0, images.length - 1))
  const [failed, setFailed] = useState<Record<string, boolean>>({})
  const [zoomed, setZoomed] = useState(false)
  const [closing, setClosing] = useState(false)
  const stage = useRef<HTMLDivElement>(null)
  const image = useRef<HTMLImageElement>(null)
  const imageSurface = useRef<HTMLDivElement>(null)
  const viewAnimation = useRef<Animation | null>(null)
  const entry = useRef<HTMLDivElement>(null)
  const dialog = useRef<HTMLDivElement>(null)
  const opening = useRef<Animation | null>(null)
  const entryFrame = useRef<number | null>(null)
  const entryGeneration = useRef(0)
  const entryPreparing = useRef(false)
  const exitAnimation = useRef<Animation | null>(null)
  const exitFrame = useRef<number | null>(null)
  const alive = useRef(true)
  const closeStarted = useRef(false)
  const dimensions = useRef({ imageWidth: 0, imageHeight: 0, stageWidth: 0, stageHeight: 0 })
  const pointers = useRef(new Map<number, Point>())
  const gesture = useRef({ start: { x: 0, y: 0 }, origin: { x: 0, y: 0 }, moved: false, pinched: false, distance: 0, scale: 1 })
  const lastTap = useRef({ time: 0, x: 0, y: 0, pointerType: '' })
  const scale = useMotionValue(1)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const activeIndex = clamp(index, 0, Math.max(0, images.length - 1))
  const src = images[activeIndex]
  function closeAndRestoreFocus() {
    onClose()
    // Our visual exit has finished. Give HeroUI's unmount/focus-scope cleanup
    // one turn, then restore only if its own restoration did not reach the source.
    clearTimeout(pendingFocusRestore)
    pendingFocusRestore = setTimeout(() => {
      pendingFocusRestore = undefined
      if (source?.isConnected && document.activeElement !== source && !document.querySelector('.wj-photo-dialog')) source.focus({ preventScroll: true })
    }, 40)
  }

  function measure() {
    const el = image.current
    const area = stage.current
    if (!el || !area) return
    dimensions.current = { imageWidth: el.clientWidth, imageHeight: el.clientHeight, stageWidth: area.clientWidth, stageHeight: area.clientHeight }
  }
  function bounds(nextScale: number) {
    const size = dimensions.current
    return { x: Math.max(0, (size.imageWidth * nextScale - size.stageWidth) / 2), y: Math.max(0, (size.imageHeight * nextScale - size.stageHeight) / 2) }
  }
  function interruptView() {
    const el = imageSurface.current
    if (viewAnimation.current && el) {
      const matrix = new DOMMatrixReadOnly(getComputedStyle(el).transform)
      scale.set(Math.hypot(matrix.a, matrix.b)); x.set(matrix.e); y.set(matrix.f)
      // Keep the visible position as the underlying style before cancelling.
      el.style.transform = `translate(${matrix.e}px, ${matrix.f}px) scale(${scale.get()})`
      viewAnimation.current.cancel()
      viewAnimation.current = null
    }
    scale.stop(); x.stop(); y.stop()
  }
  function setView(nextScale: number, nextX = 0, nextY = 0, smooth = true) {
    interruptView()
    const next = clamp(nextScale, 1, 4)
    const limit = bounds(next)
    const values = [next, clamp(nextX, -limit.x, limit.x), clamp(nextY, -limit.y, limit.y)]
    const previous = [scale.get(), x.get(), y.get()]
    const el = imageSurface.current
    const transform = (progress: number) => {
      const [s, px, py] = previous.map((value, index) => value + (values[index] - value) * progress)
      return `translate(${px}px, ${py}px) scale(${s})`
    }
    ;[scale, x, y].forEach((value, index) => value.set(values[index]))
    if (el) {
      el.style.transform = transform(1)
      if (smooth && !reduced && previous.some((value, index) => Math.abs(value - values[index]) >= 0.001)) {
        const animation = el.animate(zoomProgress.map(progress => ({ transform: transform(progress) })), { duration: 300, easing: 'linear' })
        viewAnimation.current = animation
        void animation.finished.then(() => {
          if (viewAnimation.current === animation) viewAnimation.current = null
        }).catch(() => {})
      }
    }
    setZoomed(next > 1.01)
  }
  function cancelEntryPreparation() {
    entryGeneration.current += 1
    entryPreparing.current = false
    if (entryFrame.current !== null) cancelAnimationFrame(entryFrame.current)
    entryFrame.current = null
  }
  function switchPhoto(direction: number) {
    if (closing || images.length < 2) return
    pointers.current.clear()
    gesture.current.pinched = false
    lastTap.current.time = 0
    cancelEntryPreparation()
    opening.current?.cancel()
    setView(1, 0, 0, false)
    setIndex(current => (clamp(current, 0, images.length - 1) + direction + images.length) % images.length)
  }
  function sourceTransform() {
    const el = entry.current
    const target = source?.isConnected ? source : null
    if (!el || !target || !image.current) return null
    const from = target.getBoundingClientRect()
    const to = image.current.getBoundingClientRect()
    if (from.width === 0 || to.width === 0) return null
    return `translate(${from.left + from.width / 2 - (to.left + to.width / 2)}px, ${from.top + from.height / 2 - (to.top + to.height / 2)}px) scale(${from.width / to.width}, ${from.height / to.height})`
  }
  function requestClose() {
    if (closeStarted.current) return
    closeStarted.current = true
    cancelEntryPreparation()
    setClosing(true)
    backdrop.current?.setAttribute('data-closing', 'true')
    pointers.current.clear()
    interruptView()
    const el = entry.current
    const target = activeIndex === initialIndex && !zoomed ? sourceTransform() : null
    if (!el || reduced || !el.animate || el.style.opacity === '0') { closeAndRestoreFocus(); return }
    const current = getComputedStyle(el).transform
    opening.current?.cancel()
    const frames = [{ transform: current, opacity: 1 }, { transform: target ?? current, opacity: 0 }]
    el.style.transform = current
    exitFrame.current = requestAnimationFrame(() => {
      exitFrame.current = null
      if (!alive.current) return
      exitAnimation.current = el.animate(frames, { duration: 250, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', fill: 'forwards' })
      void exitAnimation.current.finished.then(() => { if (alive.current) closeAndRestoreFocus() }).catch(() => {})
    })
  }
  useImperativeHandle(closeRequest, () => requestClose)

  function startEntry(frames?: Keyframe[]) {
    const el = entry.current
    if (!el) return
    if (opening.current || reduced || !el.animate) { el.style.opacity = '1'; return }
    opening.current = el.animate(frames ?? [{ transform: 'none', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 250, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' })
    el.style.opacity = '1'
  }
  function scheduleEntry() {
    if (opening.current || entryPreparing.current || closeStarted.current) return
    if (reduced) { measure(); startEntry(); return }
    entryPreparing.current = true
    const generation = entryGeneration.current
    const currentImage = image.current
    // Decode first, then give overlay layout and raster preparation a frame.
    // Nothing is animated or flashed while the image is being prepared.
    void (currentImage?.decode().catch(() => {}) ?? Promise.resolve()).then(() => {
      if (!alive.current || closeStarted.current || generation !== entryGeneration.current) return
      entryFrame.current = requestAnimationFrame(() => {
        measure()
        const frames = [{ transform: sourceTransform() ?? 'none', opacity: 0 }, { transform: 'none', opacity: 1 }]
        entryFrame.current = requestAnimationFrame(() => {
          entryFrame.current = null
          entryPreparing.current = false
          if (!alive.current || closeStarted.current || generation !== entryGeneration.current) return
          startEntry(frames)
        })
      })
    })
  }
  useLayoutEffect(() => {
    clearTimeout(pendingFocusRestore)
    pendingFocusRestore = undefined
    if (!reduced && entry.current) entry.current.style.opacity = '0'
    if (image.current?.complete && image.current.naturalWidth > 0) scheduleEntry()
    return cancelEntryPreparation
    // The opening origin is captured once; later images must not replay it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    alive.current = true
    const viewValues = [scale, x, y]
    const activePointers = pointers.current
    return () => {
      alive.current = false
      viewAnimation.current?.cancel()
      opening.current?.cancel()
      if (exitFrame.current !== null) cancelAnimationFrame(exitFrame.current)
      exitAnimation.current?.cancel()
      viewValues.forEach(value => value.stop())
      activePointers.clear()
    }
  }, [scale, x, y])
  useEffect(() => {
    const el = dialog.current
    if (!el) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); switchPhoto(event.key === 'ArrowLeft' ? -1 : 1) }
      if (event.key === '+' || event.key === '=') { event.preventDefault(); setView(scale.get() + 0.5, x.get(), y.get(), false) }
      if (event.key === '-') { event.preventDefault(); setView(scale.get() - 0.5, x.get(), y.get(), false) }
      if (event.key === '0') { event.preventDefault(); setView(1, 0, 0, false) }
    }
    el.addEventListener('keydown', onKeyDown)
    return () => el.removeEventListener('keydown', onKeyDown)
  })
  useEffect(() => {
    const resize = () => {
      // Layout changes have no navigation side effects and cannot leave a pan out of bounds.
      measure()
      const limit = bounds(scale.get())
      x.set(clamp(x.get(), -limit.x, limit.x)); y.set(clamp(y.get(), -limit.y, limit.y))
    }
    const observer = new ResizeObserver(resize)
    if (stage.current) observer.observe(stage.current)
    if (image.current) observer.observe(image.current)
    window.addEventListener('resize', resize)
    return () => { observer.disconnect(); window.removeEventListener('resize', resize) }
    // A new keyed image needs its own observation; gesture frames only read the cache.
  }, [src, scale, x, y])

  function down(event: ReactPointerEvent<HTMLDivElement>) {
    if (closing || failed[src] || event.button !== 0) return
    // Interrupt the spring at its visible position before following the finger.
    interruptView()
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (event.isTrusted) event.currentTarget.setPointerCapture(event.pointerId)
    const values = [...pointers.current.values()]
    if (values.length === 1) {
      gesture.current = { start: values[0], origin: { x: x.get(), y: y.get() }, moved: false, pinched: false, distance: 0, scale: scale.get() }
    } else if (values.length === 2) {
      gesture.current.pinched = true
      gesture.current.moved = true
      gesture.current.distance = Math.hypot(values[1].x - values[0].x, values[1].y - values[0].y)
      gesture.current.scale = scale.get()
    }
  }
  function move(event: ReactPointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return
    event.preventDefault()
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const values = [...pointers.current.values()]
    const current = gesture.current
    if (values.length >= 2) {
      const distance = Math.hypot(values[1].x - values[0].x, values[1].y - values[0].y)
      if (current.distance > 0) setView(current.scale * distance / current.distance, x.get(), y.get(), false)
      return
    }
    const dx = event.clientX - current.start.x
    const dy = event.clientY - current.start.y
    if (Math.hypot(dx, dy) > 8) current.moved = true
    if (scale.get() > 1.01) {
      const limit = bounds(scale.get())
      x.set(clamp(current.origin.x + dx, -limit.x, limit.x))
      y.set(clamp(current.origin.y + dy, -limit.y, limit.y))
    } else if (!current.pinched) x.set(clamp(dx * 0.45, -100, 100))
  }
  function up(event: ReactPointerEvent<HTMLDivElement>, cancelled = false) {
    if (!pointers.current.has(event.pointerId)) return
    pointers.current.delete(event.pointerId)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    const current = gesture.current
    if (pointers.current.size > 0) {
      // After a pinch, the remaining finger may pan but never flip the image.
      current.start = [...pointers.current.values()][0]
      current.origin = { x: x.get(), y: y.get() }
      return
    }
    const dx = event.clientX - current.start.x
    const dy = event.clientY - current.start.y
    if (!cancelled && !current.pinched && !zoomed && scale.get() <= 1.01 && Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.3) switchPhoto(dx > 0 ? -1 : 1)
    else {
      setView(scale.get(), x.get(), y.get())
      if (!cancelled && !current.moved && !current.pinched) {
        const now = performance.now()
        const previous = lastTap.current
        if (now - previous.time < 300 && event.pointerType === previous.pointerType && Math.hypot(event.clientX - previous.x, event.clientY - previous.y) < 30) {
          setView(scale.get() > 1.01 ? 1 : 2)
          lastTap.current.time = 0
        } else lastTap.current = { time: now, x: event.clientX, y: event.clientY, pointerType: event.pointerType }
      }
    }
  }

  return (
          <div ref={dialog} className="wj-photo-dialog-content">
          <div className="wj-photo-toolbar">
            <button type="button" autoFocus aria-label="关闭图片预览" title="关闭图片预览（Esc）" onClick={requestClose}><X size={20} aria-hidden="true" /></button>
            <span className="wj-photo-count" role="status" aria-live="polite">{activeIndex + 1} / {images.length}</span>
            <div className="wj-photo-zoom-tools">
              <button type="button" aria-label="缩小图片" title="缩小图片（−）" onClick={() => setView(scale.get() - 0.5, x.get(), y.get())}><ZoomOut size={20} aria-hidden="true" /></button>
              <button type="button" aria-label={zoomed ? '还原图片' : '放大图片'} title={zoomed ? '还原图片（0）' : '放大图片（+）'} onClick={() => setView(zoomed ? 1 : 2)}>{zoomed ? <RotateCcw size={20} aria-hidden="true" /> : <ZoomIn size={20} aria-hidden="true" />}</button>
            </div>
          </div>
          <div ref={stage} className="wj-photo-stage" onClick={event => { if (event.target === event.currentTarget) requestClose() }}>
            <div ref={entry} className="wj-photo-entry" onClick={event => { if (event.target === event.currentTarget) requestClose() }}>
              {failed[src] || !src ? <div className="wj-photo-error" role="status">这张图片暂时无法加载，可切换其他图片。</div> : <motion.div ref={imageSurface} className="wj-photo-pan" data-zoomed={zoomed || undefined} style={{ x, y, scale }} onPointerDown={down} onPointerMove={move} onPointerUp={event => up(event)} onPointerCancel={event => up(event, true)} onLostPointerCapture={event => up(event, true)}>
                <img key={src} ref={image} src={src} alt={`${label} 图片 ${activeIndex + 1}`} draggable={false} onLoad={scheduleEntry} onError={() => { setFailed(current => ({ ...current, [src]: true })); setView(1, 0, 0, false) }} />
              </motion.div>}
            </div>
          </div>
          <div className="wj-photo-footer">
            <button type="button" aria-label="上一张图片" title="上一张图片（←）" disabled={images.length < 2} onClick={() => switchPhoto(-1)}><ChevronLeft size={24} aria-hidden="true" /></button>
            <span className="wj-photo-hint">{zoomed ? '拖动查看细节 · 双击还原' : '左右滑动切图 · 双击放大'}</span>
            <button type="button" aria-label="下一张图片" title="下一张图片（→）" disabled={images.length < 2} onClick={() => switchPhoto(1)}><ChevronRight size={24} aria-hidden="true" /></button>
          </div>
          </div>
  )
}
