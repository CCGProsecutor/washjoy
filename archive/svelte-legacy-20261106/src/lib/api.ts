export const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
export const API = `${BASE}/api`;

export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API}/${path.replace(/^\//, '')}`, {
    credentials: 'same-origin',
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `请求失败 (${response.status})`);
  return payload as T;
}

export const cityRows = [
  { id: 'nanjing', name: '南京市', coords: [118.7969, 32.0603] as [number, number] },
  { id: 'yangzhou', name: '扬州市', coords: [119.4129, 32.3942] as [number, number] },
  { id: 'zhenjiang', name: '镇江市', coords: [119.425, 32.1878] as [number, number] },
];
export const categories = ['全部', '洗浴中心', '大众澡堂', '足疗会所', '街边店', '私汤'];
export const categoryImages: Record<string, string> = {
  '洗浴中心': 'category-wash-center.webp', '大众澡堂': 'category-public-bath.webp',
  '足疗会所': 'category-foot-care.webp', '街边店': 'category-street-shop.webp', '私汤': 'category-private-spa.webp',
};
export const spaImage = 'https://fehd.oss-cn-shanghai.aliyuncs.com/washjoy/assets/washjoy-spa-hero-v2.webp';
export function distanceKm(a: [number, number], b: [number, number]) {
  const rad = Math.PI / 180;
  const dLat = (b[1] - a[1]) * rad, dLng = (b[0] - a[0]) * rad;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLng / 2) ** 2));
}
export function estimateMinutes(km: number, mode: string) {
  const road = km * 1.3;
  if (mode === 'bike') return Math.max(1, Math.round(road / 18 * 60 + 2));
  if (mode === 'car') return Math.max(1, Math.round(road / 25 * 60 + 5));
  return road <= 1.5 ? Math.max(1, Math.round(road / 4.5 * 60)) : Math.round(12 + ((road - 1.5) / 20) * 60);
}
function splitTags(value: any): string[] {
  return String(value || '').split(/[|,，、]/).map((item) => item.trim()).filter(Boolean);
}

export function normalizePlace(place: any, city: string, index: number) {
  const biz = place.biz_ext || {};
  const name = String(place.name || '未命名门店');
  const text = `${name} ${place.type || ''}`;
  let type = place.adminCategory || '';
  if (!type) {
    type = /私汤|私人汤池|温泉/.test(text) ? '私汤' : /足疗|足浴|足道|修脚|足艺/.test(text) ? ((/连锁|会所/.test(text) || Number(biz.cost) >= 130) ? '足疗会所' : '街边店') : /澡堂|浴池|浴室/.test(text) ? '大众澡堂' : '洗浴中心';
  }
  const coords = typeof place.location === 'string' ? place.location.split(',').map(Number) : [Number(place.location?.lng), Number(place.location?.lat)];
  const photos = Array.isArray(place.photos) ? place.photos.map((photo: any) => String(photo?.url || '').replace(/^http:\/\//, 'https://')).filter(Boolean) : [];
  const cover = photos.length < 3 ? categoryImages[type] : '';
  const generated = cover ? `https://fehd.oss-cn-shanghai.aliyuncs.com/washjoy/assets/${cover}` : '';
  const images = [generated, ...photos].filter(Boolean);
  return {
    id: place.id || `${city}-${name}-${index}`, name, type, area: place.adname || city.replace('市', ''), address: place.address || '',
    rating: Number(biz.rating || place.rating) || null, reviews: Number(biz.rating_num || place.rating_num) || 0,
    price: Number(biz.cost || place.cost) || null, hours: biz.open_time || '', attrs: [...splitTags(place.business_area), ...splitTags(place.type?.split(';')?.[0])].slice(0, 3),
    features: [...splitTags(place.service_summary), ...splitTags(place.business_area), ...splitTags(type)], description: place.description || '', recommended: Boolean(place.recommended),
    manual: Boolean(place.manual), adminUpdatedAt: Number(place.adminUpdatedAt) || null, hasPhotos: photos.length > 0, generatedCover: Boolean(generated), images: images.length ? images : [spaImage],
    coords: coords.length === 2 && coords.every(Number.isFinite) && coords[0] && coords[1] ? coords as [number, number] : null,
    techs: Array.isArray(place.techs) ? place.techs : [], services: place.services || type,
  };
}
