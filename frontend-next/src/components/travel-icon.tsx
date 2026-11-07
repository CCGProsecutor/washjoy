import type { TravelMode } from '../lib/travel-mode'

// Generated illustration, not a business icon or a photograph of a real place.
// A finite animation plays on selection; reduced-motion always uses the still.
export function TravelIcon({ mode, selected }: { mode: TravelMode; selected: boolean }) {
  const still = `/washjoy/assets/transport/${mode}.webp`
  return <picture className="wj-travel-icon" aria-hidden="true">
    <source media="(prefers-reduced-motion: reduce)" srcSet={still} />
    <img src={selected ? `/washjoy/assets/transport/${mode}-selected.webp` : still} width={48} height={48} alt="" draggable={false} />
  </picture>
}
