import { useEffect } from 'react'

const SELECTOR = 'button,a,[role="button"],input[type="submit"],input[type="button"]'

function eligible(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null
  const node = target.closest<HTMLElement>(SELECTOR)
  if (!node || node.matches(':disabled,[aria-disabled="true"],[data-disabled="true"]')) return null
  if (node.closest('[data-motion-ignore]')) return null
  return node
}

export function MotionFeedback() {
  useEffect(() => {
    const active = new Map<number, { node: HTMLElement; x: number; y: number }>()
    const clear = (pointerId?: number) => {
      if (pointerId === undefined) {
        active.forEach(({ node }) => node.removeAttribute('data-wj-pointer-pressed'))
        active.clear()
        return
      }
      const value = active.get(pointerId)
      value?.node.removeAttribute('data-wj-pointer-pressed')
      active.delete(pointerId)
    }
    const onDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return
      const node = eligible(event.target)
      if (!node) return
      active.set(event.pointerId, { node, x: event.clientX, y: event.clientY })
      node.setAttribute('data-wj-pointer-pressed', 'true')
    }
    const onUp = (event: PointerEvent) => clear(event.pointerId)
    const onCancel = (event: PointerEvent) => clear(event.pointerId)
    const onMove = (event: PointerEvent) => {
      const origin = active.get(event.pointerId)
      if (origin && Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 9) clear(event.pointerId)
    }
    const onScroll = () => clear()
    document.addEventListener('pointerdown', onDown, { passive: true })
    document.addEventListener('pointerup', onUp, { passive: true })
    document.addEventListener('pointercancel', onCancel, { passive: true })
    document.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true, capture: true })
    window.addEventListener('blur', onScroll)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onCancel)
      document.removeEventListener('pointermove', onMove)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('blur', onScroll)
      clear()
    }
  }, [])
  return null
}
