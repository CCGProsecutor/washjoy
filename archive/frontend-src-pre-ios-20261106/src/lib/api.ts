export type User = { phone: string; role: 'user' | 'admin'; profile?: { displayName?: string }; createdAt: number }
export type Review = { id: number; placeId: string; placeName: string; rating: number; text: string; author?: string; created: number }
export const appUrl = (path = '') => `/washjoy/${path.replace(/^\//, '')}`
export type Place = {
  id: string
  name: string
  address: string
  category: string
  score?: number
  longitude?: number
  latitude?: number
  image?: string
  tags: string[]
  recommended: boolean
  images: string[]
  city: string
  price?: string
  rating?: string
  openTime?: string
  phone?: string
  description?: string
  services?: string
  area?: string
  adminManaged?: boolean
  manual?: boolean
  adminUpdatedAt?: number
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/washjoy/api/${path}`, { credentials: 'same-origin', ...init, headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || `请求失败 (${response.status})`)
  return data as T
}

function number(value: unknown): number | undefined {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.trim()) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : undefined }
  return undefined
}

export const placeCategories = ['洗浴中心', '大众澡堂', '足疗会所', '街边店', '私汤'] as const

const hasAny = (text: string, words: string[]) => words.some((word) => text.includes(word))

// 与 server/src/main.rs 的 inferred_admin_category 保持一致。公开接口只给后台编辑过的门店返回 adminCategory，
// 其余门店在这里按名称、类型和价格推断；私汤只能由后台指定。
function inferCategory(raw: Record<string, any>): string {
  const kind = String(raw.type || '')
  const text = `${raw.name || ''} ${kind}`
  const cost = number(raw.biz_ext?.cost) ?? number(raw.cost) ?? 0
  if (hasAny(text, ['足疗', '足浴', '足道', '修脚', '足艺', '足保', '采耳'])) {
    return cost >= 130 || hasAny(text, ['连锁', '足道', '足艺', '会所', '养生']) ? '足疗会所' : '街边店'
  }
  if (hasAny(text, ['大众浴室', '大众浴池', '澡堂', '浴池', '浴室', '社区浴', '便民浴', '工人浴']) || (cost > 0 && cost < 80 && kind.includes('洗浴推拿场所'))) return '大众澡堂'
  if (hasAny(text, ['洗浴', '温泉', '汤泉', '水会', '水汇', '汗蒸']) && cost > 0 && cost < 80) return '大众澡堂'
  if (hasAny(text, ['街边店', '小店', '便民'])) return '街边店'
  return '洗浴中心'
}

export function normalizePlace(raw: Record<string, any>, city = 'nanjing'): Place {
  const location = typeof raw.location === 'string' ? raw.location.split(',').map(Number) : [number(raw.location?.lng), number(raw.location?.lat)]
  const photos = Array.isArray(raw.photos) ? raw.photos.map((photo: any) => typeof photo === 'string' ? photo : photo?.url).filter(Boolean) : []
  const score = number(raw.reviewRating) ?? number(raw.biz_ext?.rating) ?? number(raw.rating)
  const category = (placeCategories as readonly string[]).includes(raw.adminCategory) ? raw.adminCategory : inferCategory(raw)
  return {
    ...raw,
    id: String(raw.id), name: String(raw.name || ''), address: String(raw.address || ''), category,
    longitude: location[0], latitude: location[1], score, image: photos[0], images: photos,
    tags: Array.isArray(raw.tags) ? raw.tags : [], recommended: raw.recommended === true,
    city: String(raw.cityId || raw.city || city), price: String(raw.biz_ext?.cost || raw.price || ''),
    rating: String(raw.biz_ext?.rating || raw.rating || ''), openTime: String(raw.biz_ext?.open_time || raw.openTime || ''),
  }
}

export async function getPlaces(city = 'nanjing'): Promise<Place[]> {
  const data = await api<{ pois?: Record<string, any>[] }>(`public-data?city=${encodeURIComponent(city)}`)
  return (data.pois || []).map((place) => normalizePlace(place, city))
}

export async function getSession(): Promise<User | null> {
  try {
    const response = await fetch(`/washjoy/api/auth/me`, { credentials: 'same-origin' })
    if (!response.ok) return null
    return await response.json() as User
  } catch { return null }
}

export function savedPlacesKey(user: User | null): string {
  return `washjoy:saved:${user?.phone || 'guest'}`
}
