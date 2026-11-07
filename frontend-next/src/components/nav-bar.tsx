import { ChevronLeft } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { appUrl } from '../lib/api'
import { Icon } from './ui/icon'

// iOS 大标题导航栏：大标题滚出视野后，顶部栏中间淡入小标题。
export function NavBar({ title, back = true, trailing }: { title: string; back?: boolean; trailing?: ReactNode }) {
  const sentinel = useRef<HTMLDivElement>(null)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const el = sentinel.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => setCollapsed(!entry.isIntersecting), { rootMargin: `-${44}px 0px 0px 0px` })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <header className={`wj-navbar wj-glass${collapsed ? ' is-collapsed' : ''}`}>
        {back ? <a className="wj-nav-back wj-subhead" href={appUrl()}><Icon icon={ChevronLeft} size="lg" />附近</a> : <span />}
        <span className="wj-nav-title wj-headline" aria-hidden="true">{title}</span>
        <span className="wj-nav-trailing">{trailing}</span>
      </header>
      <div className="wj-large-title" ref={sentinel}><h1 className="wj-title1">{title}</h1></div>
    </>
  )
}
