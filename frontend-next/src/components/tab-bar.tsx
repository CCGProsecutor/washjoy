import { Heart, MapPin, UserRound } from 'lucide-react'
import { appUrl } from '../lib/api'
import { Icon } from './ui/icon'

const tabs = [
  { id: 'nearby', label: '附近', href: () => appUrl(), icon: MapPin },
  { id: 'saved', label: '收藏', href: () => appUrl('mine/'), icon: Heart },
  { id: 'me', label: '我的', href: () => appUrl('account/'), icon: UserRound },
] as const

// Stable bottom navigation with the shared warm surface and system safe area.
export function TabBar({ active }: { active: (typeof tabs)[number]['id'] }) {
  return (
    <nav className="wj-tabbar wj-glass" aria-label="主导航">
      {tabs.map(({ id, label, href, icon }) => (
        <a key={id} href={href()} className="wj-tab" aria-current={active === id ? 'page' : undefined} data-motion-feedback="tab">
          <Icon icon={icon} size="lg" />
          <span className="wj-caption">{label}</span>
        </a>
      ))}
    </nav>
  )
}
