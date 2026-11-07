import { ToggleButton, ToggleButtonGroup } from '@heroui/react'
import type { LucideIcon } from 'lucide-react'
import { Icon } from './icon'

export type SegmentOption<T extends string> = { value: T; label: string; icon?: LucideIcon }

// iOS 分段控件：单选，不允许取消选中（再点已选项不会变空）。
export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (value: T) => void; options: SegmentOption<T>[]; label: string }) {
  return (
    <ToggleButtonGroup className="wj-segmented" aria-label={label} selectionMode="single" disallowEmptySelection selectedKeys={[value]} onSelectionChange={(next) => { const picked = [...next][0] as T | undefined; if (picked) onChange(picked) }}>
      {options.map((option) => (
        <ToggleButton key={option.value} id={option.value} className="wj-segment">
          {option.icon && <Icon icon={option.icon} size="sm" />}
          <span>{option.label}</span>
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  )
}
