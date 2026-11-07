import { Check, ChevronDown, Ruler } from 'lucide-react'
import { radiusLabel, radiusSteps } from '../lib/use-nearby'

export function RadiusMenu({ index, onChange }: { index: number; onChange: (index: number) => void; container?: HTMLElement | null }) {
  return (
    <details className="wj-radius-details">
      <summary className="wj-radius-trigger" role="button" aria-label="搜索范围">
        <Ruler size={15} />{radiusLabel(radiusSteps[index])}<ChevronDown size={14} />
      </summary>
      <div className="wj-radius-dropdown" role="dialog" aria-label="搜索范围">
        {radiusSteps.map((step, stepIndex) => (
          <button key={step} type="button" className="wj-radius-option"
            onClick={(e) => { onChange(stepIndex); (e.currentTarget.closest('details') as HTMLDetailsElement | null)?.removeAttribute('open') }}>
            <span>{radiusLabel(step)}</span>
            {index === stepIndex && <Check size={16} />}
          </button>
        ))}
      </div>
    </details>
  )
}
