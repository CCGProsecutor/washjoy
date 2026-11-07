import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from './button'
import { Icon } from './icon'

export function SkeletonRows({ count = 4 }: { count?: number }) {
  return (
    <div className="wj-skeletons" aria-busy="true" aria-label="正在加载">
      {Array.from({ length: count }, (_, index) => (
        <div className="wj-skeleton-row" key={index}><span className="wj-skeleton wj-skeleton-thumb" /><div><i className="wj-skeleton" /><i className="wj-skeleton" /><i className="wj-skeleton" /></div></div>
      ))}
    </div>
  )
}

export function EmptyState({ icon, title, hint, actions }: { icon: LucideIcon; title: string; hint?: string; actions?: ReactNode }) {
  return (
    <div className="wj-empty" role="status">
      <span className="wj-empty-icon"><Icon icon={icon} size="lg" /></span>
      <p className="wj-headline">{title}</p>
      {hint && <p className="wj-footnote wj-secondary">{hint}</p>}
      {actions && <div className="wj-empty-actions">{actions}</div>}
    </div>
  )
}

export function ErrorState({ title, hint, onRetry }: { title: string; hint?: string; onRetry: () => void }) {
  return (
    <div className="wj-empty" role="alert">
      <p className="wj-headline">{title}</p>
      {hint && <p className="wj-footnote wj-secondary">{hint}</p>}
      <div className="wj-empty-actions"><Button variant="secondary" onClick={onRetry}>重试</Button></div>
    </div>
  )
}
