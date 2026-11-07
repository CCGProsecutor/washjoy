import type { LucideIcon } from 'lucide-react'

// 全站图标只有三档尺寸、统一线宽。页面里不要再直接写 size={数字}。
const sizes = { sm: 14, md: 18, lg: 22 } as const
export type IconSize = keyof typeof sizes

export function Icon({ icon: Glyph, size = 'md', fill, className }: { icon: LucideIcon; size?: IconSize; fill?: boolean; className?: string }) {
  return <Glyph aria-hidden="true" width={sizes[size]} height={sizes[size]} strokeWidth={1.75} fill={fill ? 'currentColor' : 'none'} className={className} />
}
