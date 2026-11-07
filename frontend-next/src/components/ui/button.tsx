import { Button as HeroButton } from '@heroui/react'
import { LoaderCircle } from 'lucide-react'
import type { ComponentProps } from 'react'
import { Icon } from './icon'

type Props = Omit<ComponentProps<typeof HeroButton>, 'variant' | 'className' | 'children'> & {
  variant?: 'primary' | 'secondary' | 'plain' | 'glass'
  iconOnly?: boolean
  loading?: boolean
  disabled?: boolean
  className?: string
  children?: React.ReactNode
}
export function Button({ variant = 'secondary', iconOnly, loading, className = '', disabled, isDisabled, children, ...rest }: Props) {
  return <HeroButton {...rest} variant={variant === 'primary' ? 'primary' : 'tertiary'} isIconOnly={iconOnly} isDisabled={disabled || isDisabled || loading} aria-busy={loading || undefined} className={`wj-btn wj-btn-${variant}${iconOnly ? ' wj-btn-icon' : ''} ${className}`}>
    {loading && <Icon icon={LoaderCircle} size="sm" className="wj-spin" />}{children}
  </HeroButton>
}
