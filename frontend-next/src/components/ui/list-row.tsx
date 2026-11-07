import { Button } from '@heroui/react'
import { ChevronRight, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Icon } from './icon'

// iOS 分组列表：圆角白底卡片，行与行之间用缩进的细分隔线。
export function ListGroup({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <section className="wj-group">
      {label && <h2 className="wj-group-label wj-footnote wj-secondary">{label}</h2>}
      <div className="wj-group-body">{children}</div>
    </section>
  )
}

type RowProps = { icon?: LucideIcon; title: string; detail?: string; href?: string; onClick?: () => void; destructive?: boolean; disabled?: boolean; trailing?: ReactNode }

export function ListRow({ icon, title, detail, href, onClick, destructive, disabled, trailing }: RowProps) {
  const body = (
    <>
      {icon && <span className="wj-row-icon"><Icon icon={icon} size="md" /></span>}
      <span className="wj-list-text"><span className="wj-body">{title}</span>{detail && <span className="wj-footnote wj-secondary">{detail}</span>}</span>
      {trailing ?? (href || onClick ? <span className="wj-chevron"><Icon icon={ChevronRight} size="sm" /></span> : null)}
    </>
  )
  const cls = `wj-list-row${destructive ? ' is-destructive' : ''}`
  if (href) return <a className={cls} href={href}>{body}</a>
  if (onClick) return <Button variant="ghost" className={cls} onPress={onClick} isDisabled={disabled}>{body}</Button>
  return <div className={cls}>{body}</div>
}
