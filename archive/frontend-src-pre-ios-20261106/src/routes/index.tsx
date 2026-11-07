import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Bike, ChevronDown, Clock3, LocateFixed, MapPin,
  Search, SlidersHorizontal, Star, TrainFront, X, CarFront, Heart,
  MessageSquareText, Navigation,
} from 'lucide-react'
import { api, appUrl, getPlaces, getSession, placeCategories, savedPlacesKey, type Place, type Review, type User } from '../lib/api'
import { cityDatasets, loadAMap, locate, type LocationFix } from '../lib/amap'

export const Route = createFileRoute('/')({ component: Home })

const radiusSteps = [3, 5, 10, 0]
const radiusLabel = (km: number) => km === 0 ? '全城' : `${km} 公里`

const categories = ['全部', ...placeCategories]
const travelModes = [
  { id: 'transit', label: '公交地铁', Icon: TrainFront },
  { id: 'bike', label: '骑行', Icon: Bike },
  { id: 'car', label: '驾车', Icon: CarFront },
]

function distanceInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radians = (value: number) => value * Math.PI / 180
  const dLat = radians(lat2 - lat1)
  const dLon = radians(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function Home() {
  const prefersReducedMotion = useReducedMotion()
  const [category, setCategory] = useState('全部')
  const [travelMode, setTravelMode] = useState('transit')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Place | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [recommended, setRecommended] = useState(false)
  const [limit, setLimit] = useState(50)
  const [fix, setFix] = useState<LocationFix | null>(null)
  const [locationState, setLocationState] = useState<'pending' | 'ready' | 'failed'>('pending')
  const [locating, setLocating] = useState(false)
  const [locationMessage, setLocationMessage] = useState('')
  const [radiusIndex, setRadiusIndex] = useState(0)
  const [mapReady, setMapReady] = useState(false)
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewText, setReviewText] = useState('')
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewError, setReviewError] = useState('')
  const [reviewBusy, setReviewBusy] = useState(false)
  const [mapError, setMapError] = useState(false)
  const [session, setSession] = useState<User | null>(null)
  const [saved, setSaved] = useState<string[]>([])
  const matchedCity = fix?.city ? cityDatasets.find((item) => fix.city.startsWith(item.name.replace('市', ''))) : undefined
  const dataset = matchedCity ?? cityDatasets[0]
  const outsideCoverage = Boolean(fix?.city) && !matchedCity
  const userLocation = fix && fix.precise && !outsideCoverage ? fix : null
  const radiusKm = userLocation ? radiusSteps[radiusIndex] : 0
  const { data = [], isPending, isError, refetch } = useQuery({
    queryKey: ['places', dataset.id],
    queryFn: () => getPlaces(dataset.id),
    staleTime: 60_000,
    retry: 1,
  })

  function locateUser() {
    setLocating(true)
    setLocationState('pending')
    setLocationMessage('')
    locate().then((result) => {
      setFix(result); setLocationState('ready'); setRadiusIndex(0); setLimit(50)
    }).catch((error: unknown) => {
      const text = error instanceof Error ? error.message : ''
      setLocationState('failed')
      setLocationMessage(/denied|permission|PERMISSION/i.test(text) ? '请允许浏览器定位权限' : /timeout|TIMEOUT/i.test(text) ? '定位超时，请重试' : '暂时无法定位，可点右上角重试')
    }).finally(() => setLocating(false))
  }

  useEffect(() => { locateUser() }, [])
  useEffect(() => { void getSession().then(setSession) }, [])
  useEffect(() => {
    try { setSaved(JSON.parse(localStorage.getItem(savedPlacesKey(session)) || '[]')) } catch { setSaved([]) }
  }, [session])

  function toggleSaved(place: Place) {
    if (!session) { window.location.assign(`${appUrl('account/')}?returnPlace=${encodeURIComponent(place.id)}`); return }
    const next = saved.includes(place.id) ? saved.filter((id) => id !== place.id) : [...saved, place.id]
    setSaved(next)
    localStorage.setItem(savedPlacesKey(session), JSON.stringify(next))
  }

  const places = useMemo(() => data.filter((place) => {
    const text = `${place.name} ${place.address} ${place.category}`
    const matchesQuery = text.toLowerCase().includes(query.trim().toLowerCase())
    const matchesCategory = category === '全部' || place.category === category
    return matchesQuery && matchesCategory && (!recommended || place.recommended)
  }).map((place) => ({
    place,
    distance: userLocation && place.latitude && place.longitude
      ? distanceInKm(userLocation.latitude, userLocation.longitude, place.latitude, place.longitude)
      : null,
  })).filter(({ distance }) => !userLocation || radiusKm === 0 || (distance !== null && distance <= radiusKm))
    .sort((a, b) => (a.distance ?? Number.MAX_VALUE) - (b.distance ?? Number.MAX_VALUE))
    .map(({ place }) => place), [category, data, query, recommended, userLocation, radiusKm])

  useEffect(() => {
    if (!selected) { setReviews([]); setReviewText(''); setReviewError(''); return }
    let cancelled = false
    api<{ reviews: Review[] }>(`reviews?placeId=${encodeURIComponent(selected.id)}&city=${encodeURIComponent(selected.city)}`)
      .then((result) => { if (!cancelled) setReviews(result.reviews || []) })
      .catch(() => { if (!cancelled) setReviews([]) })
    return () => { cancelled = true }
  }, [selected])

  async function submitReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected || !reviewText.trim()) return
    setReviewBusy(true); setReviewError('')
    try {
      await api('reviews', { method: 'POST', body: JSON.stringify({ place_id: selected.id, city: selected.city, rating: reviewRating, text: reviewText.trim() }) })
      setReviewText('')
      const result = await api<{ reviews: Review[] }>(`reviews?placeId=${encodeURIComponent(selected.id)}&city=${encodeURIComponent(selected.city)}`)
      setReviews(result.reviews || [])
    } catch (cause) {
      if (cause instanceof Error && /登录状态|未登录|401/.test(cause.message)) {
        window.location.assign(`${appUrl('account/')}?returnPlace=${encodeURIComponent(selected.id)}`)
      } else setReviewError(cause instanceof Error ? cause.message : '评价提交失败，请重试')
    } finally { setReviewBusy(false) }
  }

  const mapRef = useRef<any>(null)
  const sdkRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const userMarkerRef = useRef<any>(null)

  useEffect(() => {
    let disposed = false
    loadAMap().then((sdk) => {
      const host = document.getElementById('washjoy-map')
      if (disposed || !host) return
      sdkRef.current = sdk
      mapRef.current = new sdk.Map(host, { zoom: 12, center: cityDatasets[0].center, viewMode: '2D', mapStyle: 'amap://styles/normal', resizeEnable: true })
      setMapReady(true)
    }).catch(() => setMapError(true))
    return () => { disposed = true; mapRef.current?.destroy(); mapRef.current = null; setMapReady(false) }
  }, [])

  useEffect(() => {
    const map = mapRef.current, sdk = sdkRef.current
    if (!mapReady || !map || !sdk) return
    map.remove(markersRef.current)
    markersRef.current = places.slice(0, limit).flatMap((place, index) => {
      if (!place.longitude || !place.latitude) return []
      const marker = new sdk.Marker({ position: [place.longitude, place.latitude], title: place.name, anchor: 'bottom-center', content: `<button class="map-pin" data-place-id="${place.id.replace(/"/g, '')}" aria-label="${index + 1} ${place.name.replace(/"/g, '')}"><small>${index + 1}</small></button>` })
      return [marker]
    })
    map.add(markersRef.current)
  }, [mapReady, places, limit])

  // 高德在触屏上会接管触摸事件，Marker 的 click 在手机上经常不触发。
  // 这里在地图容器上用捕获阶段的指针事件自己判断"点按"（移动不超过 10px）。
  const placesRef = useRef(places)
  placesRef.current = places
  useEffect(() => {
    const host = document.getElementById('washjoy-map')
    if (!host) return
    let start: { x: number; y: number; id: string } | null = null
    const down = (event: PointerEvent) => {
      const pin = (event.target as Element | null)?.closest?.('.map-pin') as HTMLElement | null
      start = pin?.dataset.placeId ? { x: event.clientX, y: event.clientY, id: pin.dataset.placeId } : null
    }
    const up = (event: PointerEvent) => {
      if (!start) return
      const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y)
      const id = start.id
      start = null
      if (moved > 10) return
      const place = placesRef.current.find((item) => item.id === id)
      if (place) setSelected(place)
    }
    const cancel = () => { start = null }
    host.addEventListener('pointerdown', down, true)
    window.addEventListener('pointerup', up, true)
    window.addEventListener('pointercancel', cancel, true)
    return () => { host.removeEventListener('pointerdown', down, true); window.removeEventListener('pointerup', up, true); window.removeEventListener('pointercancel', cancel, true) }
  }, [mapReady])

  useEffect(() => {
    const map = mapRef.current, sdk = sdkRef.current
    if (!mapReady || !map || !sdk) return
    if (userMarkerRef.current) { map.remove(userMarkerRef.current); userMarkerRef.current = null }
    if (userLocation) {
      userMarkerRef.current = new sdk.Marker({ position: [userLocation.longitude, userLocation.latitude], content: '<span class="amap-user-dot"></span>', anchor: 'center', zIndex: 200 })
      map.add(userMarkerRef.current)
      map.setZoomAndCenter(radiusKm === 0 ? 12 : radiusKm <= 1 ? 15 : radiusKm <= 3 ? 14 : 13, [userLocation.longitude, userLocation.latitude])
    } else {
      map.setZoomAndCenter(12, dataset.center)
    }
  }, [mapReady, userLocation, radiusKm, dataset])

  // 后台编辑过的门店：把管理员填写的评分、介绍和服务作为置顶的"站长点评"。
  const adminNote = useMemo(() => {
    if (!selected || !(selected.adminManaged || selected.manual)) return null
    const description = String(selected.description || '').trim()
    const services = String(selected.services || '').split(/[|｜,，、]/).map((item) => item.trim()).filter(Boolean)
    const rating = Number(selected.rating) > 0 ? Number(selected.rating).toFixed(1) : ''
    return description || services.length ? { description, services, rating } : null
  }, [selected])

  const transition = prefersReducedMotion ? { duration: 0 } : { type: 'spring' as const, damping: 28, stiffness: 260, mass: 0.8 }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href={appUrl()} aria-label="Washjoy 附近"><span className="brand-mark"><span /></span><span>Washjoy</span></a>
        <div className="city-button" role="status" aria-label="当前定位城市"><MapPin size={16} />{fix?.city || (locating ? '定位中…' : '未定位')}</div>
        <a className="avatar-link" href={appUrl('account/')} aria-label="账户"><span>林</span></a>
      </header>

      <section className="map-stage" aria-label="附近门店地图">
        <div className="map-art" aria-hidden="true">
          <svg viewBox="0 0 1000 760" preserveAspectRatio="xMidYMid slice">
            <path className="river" d="M-60 510 C150 390 240 610 430 495 S720 360 1060 460 L1060 640 C780 570 650 700 410 630 S130 680 -60 740Z" />
            <path className="park" d="M30 85h180v110H30zM735 80h210v120H735zM780 595h240v130H780zM180 580h170v130H180z" />
            <g className="road"><path d="M-40 300 1040 250M90 -30 200 800M435 -30 520 800M780 -30 715 800M-30 720 1010 120M-20 110 1030 670"/><path d="M-30 420 1020 405M-30 180 1030 520" /></g>
            <g className="block"><path d="M248 80h128v68H248zM560 90h122v94H560zM278 224h105v88H278zM560 230h138v110H560zM55 380h95v95H55zM854 300h105v105H854zM385 690h100v75H385zM610 585h120v100H610z"/></g>
          </svg>
        </div>
        <div id="washjoy-map" className="amap-host" aria-label="地图互动区域" />
        {mapError && <div className="map-fallback-status" role="status">地图服务暂不可用，门店列表仍可浏览</div>}
        <div className="map-topline">
          <label className="search-field"><Search size={19} /><input id="place-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜店名、区域或体验" /><kbd>⌘ K</kbd></label>
          <button className="icon-button locate-button" aria-label="定位到当前位置" title={locationState === 'failed' ? (locationMessage || '定位失败，请重试') : '定位到当前位置'} onClick={locateUser} disabled={locating}><LocateFixed size={19} /></button>
        </div>
        <div className="map-side-actions"><button className="map-action" aria-label="重新定位" title="重新定位" onClick={locateUser} disabled={locating}><Navigation size={17} /></button><button className="map-action" onClick={() => setFiltersOpen(true)} aria-label="打开筛选"><SlidersHorizontal size={17} /></button></div>
        <div className="map-footer">
          <div className="map-status" role="status"><span className="status-dot" />{locating ? '正在获取位置…' : isPending ? '正在查找门店' : userLocation ? `${places.length} 家门店 · ${radiusLabel(radiusKm)}内` : `${places.length} 家门店`}<span className="status-separator">·</span>{locating ? '定位中' : locationState === 'failed' ? (locationMessage || '定位失败，可重试') : outsideCoverage ? `${fix?.city}暂无数据，显示${dataset.name}` : locationState === 'ready' ? (fix?.precise ? '已定位' : '大致位置，点右上角重试') : `${dataset.name}默认视野`}</div>
          <div className="travel-control" aria-label="出行方式">{travelModes.map(({ id, label, Icon }) => <button key={id} className={travelMode === id ? 'selected' : ''} onClick={() => setTravelMode(id)}><Icon size={15} /><span>{label}</span></button>)}</div>
        </div>
      </section>

      <nav className="category-tabs" aria-label="门店类型">{categories.map((item) => <button key={item} className={category === item ? 'active' : ''} onClick={() => { setCategory(item); setLimit(50) }}>{item}</button>)}</nav>

      <motion.section className="results-sheet" layout transition={transition}>
        <div className="sheet-grabber" aria-hidden="true" />
        <div className="sheet-heading"><div><div className="section-kicker">根据位置为你整理</div><h1>附近推荐 <span>{places.length}</span></h1></div><button className={`recommend-toggle ${recommended ? 'active' : ''}`} aria-pressed={recommended} onClick={() => setRecommended(!recommended)}><Star size={16} fill={recommended ? 'currentColor' : 'none'} />站长推荐</button></div>
        {filtersOpen && <div className="filter-row"><span><Clock3 size={14} />预计到达</span>{[15, 30, 45, 60].map((n) => <button key={n} onClick={() => setFiltersOpen(false)}>{n === 60 ? '1 小时内' : `${n} 分钟内`}</button>)}<button className="filter-close" onClick={() => setFiltersOpen(false)} aria-label="关闭筛选"><X size={15} /></button></div>}
        <div className="result-caption">{isPending ? '正在同步附近门店…' : isError ? '门店数据暂时不可用' : `按${travelModes.find((mode) => mode.id === travelMode)?.label}预计时间排序`}</div>
        {isError ? <div className="empty-state"><p>暂时连接不上门店服务</p><button onClick={() => void refetch()}>重试</button></div> : isPending ? <div className="place-grid">{[0, 1, 2].map((item) => <div className="place-skeleton" key={item}><span /><div><i /><i /><i /></div></div>)}</div> : places.length === 0 ? <div className="empty-state"><p>{userLocation && radiusKm !== 0 ? `${radiusLabel(radiusKm)}内没有匹配的门店` : '没有匹配的门店'}</p>{userLocation && radiusKm !== 0 && <button onClick={() => setRadiusIndex(radiusIndex + 1)}>扩大到{radiusLabel(radiusSteps[radiusIndex + 1])}</button>}<button onClick={() => { setQuery(''); setCategory('全部'); setRecommended(false) }}>清除筛选</button></div> : <div className="place-grid">{places.slice(0, limit).map((place, index) => <motion.button className="place-card" key={place.id} layout initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...transition, delay: prefersReducedMotion ? 0 : Math.min(index * 0.025, 0.15) }} onClick={() => setSelected(place)}>
          <div className="place-image">{place.image ? <img src={place.image} alt="" loading="lazy" /> : <div className={`image-placeholder tone-${index % 4}`}><span>{place.category || '附近体验'}</span></div>}<span className="image-fade" /></div>
          <div className="place-copy"><div className="place-top"><span className="place-type">{place.category || '休闲体验'}</span><span className="place-score"><Star size={13} fill="currentColor" />{place.score?.toFixed(1) ?? '新店'}</span></div><h2>{place.name}</h2><p>{place.address || `${dataset.name} · 查看位置`}</p><div className="place-tags">{(place.tags ?? []).slice(0, 2).map((tag) => <span key={tag}>{tag}</span>)}</div></div>
          <span className="card-arrow"><ChevronDown size={16} /></span>
        </motion.button>)}</div>}
        {places.length > limit && <button className="load-more" onClick={() => setLimit(limit + 50)}>继续加载更多（再 50 家） <ChevronDown size={15} /></button>}
      </motion.section>

      <div className="bottom-nav"><a className="active" href={appUrl()}><MapPin size={19} /><span>附近</span></a><a href={appUrl('mine/')}><Heart size={19} /><span>收藏</span></a><a href={appUrl('account/')}><MessageSquareText size={19} /><span>我的</span></a></div>

      <AnimatePresence>
        {selected && <motion.div className="detail-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelected(null)}>
          <motion.aside className="detail-panel" role="dialog" aria-modal="true" aria-label={selected.name} initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={transition} onClick={(event) => event.stopPropagation()}>
            <div className="detail-handle" /><button className="detail-close" onClick={() => setSelected(null)} aria-label="关闭门店详情"><X size={19} /></button>
            <div className="detail-cover">{selected.image ? <img src={selected.image} alt="" /> : <div className="detail-cover-fallback">{selected.category || '附近体验'}</div>}</div>
            <div className="detail-content"><div className="detail-eyebrow">{selected.category || '休闲体验'} · {dataset.name}</div><h2>{selected.name}</h2><div className="detail-rating"><Star size={16} fill="currentColor" />{selected.score?.toFixed(1) ?? '新店'}{userLocation && selected.latitude && selected.longitude && <><span>·</span> {distanceInKm(userLocation.latitude, userLocation.longitude, selected.latitude, selected.longitude).toFixed(1)} km</>}</div><p>{selected.address || `${dataset.name} · 查看位置`}</p>{selected.price && <p className="detail-price">人均 ¥{selected.price}</p>}<div className="detail-tags">{selected.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><div className="detail-actions"><button className={`save-button ${saved.includes(selected.id) ? 'is-saved' : ''}`} aria-pressed={saved.includes(selected.id)} onClick={() => toggleSaved(selected)}><Heart size={17} fill={saved.includes(selected.id) ? 'currentColor' : 'none'} />{saved.includes(selected.id) ? '已收藏' : '收藏'}</button><a href={`/washjoy/account/?returnPlace=${encodeURIComponent(selected.id)}`}><MessageSquareText size={17} />写评价</a><button className="primary-action" onClick={() => { if (selected.longitude && selected.latitude) window.open(`https://uri.amap.com/marker?position=${selected.longitude},${selected.latitude}&name=${encodeURIComponent(selected.name)}`, '_blank', 'noopener') }}><Navigation size={17} />路线</button></div><section className="reviews-section"><h3>用户评价 <span>{reviews.length + (adminNote ? 1 : 0)}</span></h3><form className="review-form" onSubmit={submitReview}><div className="rating-picker" aria-label="评分">{[1,2,3,4,5].map((score) => <button key={score} type="button" aria-label={`${score} 星`} aria-pressed={reviewRating === score} onClick={() => setReviewRating(score)}><Star size={17} fill={score <= reviewRating ? 'currentColor' : 'none'} /></button>)}</div><textarea value={reviewText} onChange={(event) => setReviewText(event.target.value)} maxLength={500} placeholder="分享这次体验" aria-label="评价内容"/><div className="review-submit-row">{reviewError && <span role="alert">{reviewError}</span>}<button disabled={reviewBusy || !reviewText.trim()}>{reviewBusy ? '提交中…' : '发布评价'}</button></div></form>{adminNote && <article className="review-item admin-review"><div><strong><span className="admin-badge">站长</span>站长点评</strong>{adminNote.rating && <span className="admin-review-score"><Star size={12} fill="currentColor" />{adminNote.rating}</span>}</div>{adminNote.description && <p>{adminNote.description}</p>}{adminNote.services.length > 0 && <div className="admin-review-tags">{adminNote.services.map((item) => <span key={item}>{item}</span>)}</div>}</article>}{reviews.map((review) => <article className="review-item" key={review.id}><div><strong>{review.author || '用户'}</strong><span>{new Date(review.created * 1000).toLocaleDateString('zh-CN')}</span></div><p>{review.text}</p></article>)}</section></div>
          </motion.aside>
        </motion.div>}
      </AnimatePresence>
    </main>
  )
}
