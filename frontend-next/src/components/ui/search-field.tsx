import { Input, Button } from '@heroui/react'
import { Search, X } from 'lucide-react'
import type { ComponentProps } from 'react'
import { Icon } from './icon'

// iOS 搜索框：圆角填充、左侧放大镜、有内容时出现清除按钮。字号 17px，避免 iOS 聚焦时放大页面。
export function SearchField({ value, onValueChange, onClear, placeholder, ...rest }: { value: string; onValueChange: (value: string) => void; onClear: () => void; placeholder: string } & Omit<ComponentProps<typeof Input>, 'value' | 'onChange' | 'className' | 'placeholder'>) {
  return (
    <label className="wj-search">
      <Icon icon={Search} size="md" />
      <Input {...rest} className="wj-search-input" type="search" enterKeyHint="search" autoComplete="off" autoCorrect="off" value={value} placeholder={placeholder} onChange={(event) => onValueChange(event.target.value)} />
      {value && <Button type="button" isIconOnly variant="ghost" className="wj-search-clear" aria-label="清除搜索" onClick={onClear}><Icon icon={X} size="sm" /></Button>}
    </label>
  )
}
