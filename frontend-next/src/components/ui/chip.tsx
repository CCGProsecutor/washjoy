import { ToggleButton, ToggleButtonGroup } from '@heroui/react'

// 横向可滚动的分类标签，单选。视觉高度 32px，点击区域用伪元素扩到 44px。
export function ChipRow<T extends string>({ value, onChange, options, label }: { value: T; onChange: (value: T) => void; options: readonly T[]; label: string }) {
  return (
    <ToggleButtonGroup className="wj-chips" aria-label={label} selectionMode="single" disallowEmptySelection selectedKeys={[value]} onSelectionChange={(next) => { const picked = [...next][0] as T | undefined; if (picked) onChange(picked) }}>
      {options.map((option) => (
        <ToggleButton key={option} id={option} className="wj-chip">{option}</ToggleButton>
      ))}
    </ToggleButtonGroup>
  )
}
