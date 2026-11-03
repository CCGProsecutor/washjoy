'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { motion } from 'motion/react'
import { Heart, MapPin, Search, UserRound, LocateFixed, Plus, Minus, Star, ChevronLeft, ChevronRight, X, Map as MapIcon, Bookmark, MessageSquareText, Send, Clock3, TrainFront, Bike, CarFront, Bath, ArrowUpDown, SlidersHorizontal, ChevronDown, Snowflake, MessageCircle, Store, Sparkles } from 'lucide-react'
import './styles.css'

const OSS_ASSET_BASE = 'https://fehd.oss-cn-shanghai.aliyuncs.com/washjoy/assets'
const APP_BASE = '/washjoy/'
const spaImage = `${OSS_ASSET_BASE}/washjoy-spa-hero-v2.webp`
const generatedCategoryImages = {
  '洗浴中心': `${OSS_ASSET_BASE}/category-wash-center.webp`,
  '大众澡堂': `${OSS_ASSET_BASE}/category-public-bath.webp`,
  '足疗会所': `${OSS_ASSET_BASE}/category-foot-care.webp`,
  '街边店': `${OSS_ASSET_BASE}/category-street-shop.webp`,
  '私汤': `${OSS_ASSET_BASE}/category-private-spa.webp`,
}
const targetCities = ['南京市', '扬州市', '镇江市']
const closestCity = coords => Object.entries(cityCenters).map(([name, center]) => ({ name, km: distanceKm([coords.longitude, coords.latitude], center) })).sort((a, b) => a.km - b.km)[0]
const citySlugs = { 南京市: 'nanjing', 扬州市: 'yangzhou', 镇江市: 'zhenjiang' }
const cityCenters = { 南京市: [118.7969, 32.0603], 扬州市: [119.4129, 32.3942], 镇江市: [119.425, 32.1878] }
const categories = ['全部', '洗浴中心', '大众澡堂', '足疗会所', '街边店', '私汤']
const timeOptions = [15, 30, 45, 60]
const featureIcon = label => /冷却|冰|降温/.test(label) ? Snowflake : /教诲|聊天|交流|沟通/.test(label) ? MessageCircle : /街边店|澡堂|洗浴中心|足疗会所|私汤/.test(label) ? Store : /南京|扬州|镇江|区域|位置/.test(label) ? MapPin : Sparkles
const readStore = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback } }
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
const inferType = (name, type = '', cost = 0, place = {}) => {
  const text = `${name} ${type} ${place.business_area || ''}`
  const leaf = String(type).split(/[;|]/).at(-1) || ''
  if (/私汤|私人汤池|独立汤池|私密汤屋|private|温泉/.test(text)) return '私汤'
  const foot = /足疗|足浴|足道|修脚|足艺|足保|采耳/.test(text)
  if (foot) {
    const chain = /陆琴|郑远元|足生堂|良子|华夏良子|富侨|重庆富侨|知足常乐|千子莲|足之语|指间道|大桶水|鼎足|足力健|连锁/.test(text)
    if (chain || (cost >= 130 && /旗舰|会所|养生|SPA|中心/.test(text))) return '足疗会所'
    if (cost > 0 && cost <= 120 || /社区|居民区|便民|街边|小店|分店/.test(text)) return '街边店'
    return cost >= 130 ? '足疗会所' : '街边店'
  }
  if (/大众浴室|大众浴池|澡堂|浴池|浴室|社区浴|便民浴|工人浴/.test(text) || (cost > 0 && cost < 80 && /洗浴推拿场所|生活服务场所/.test(leaf))) return '大众澡堂'
  if (/洗浴推拿场所/.test(type) && (cost >= 120 || /水会|水汇|水疗|汗蒸|自助餐|浴乐|休闲会所|洗浴中心|温泉度假/.test(text) || place.groupbuy || place.discount)) return '洗浴中心'
  if (/洗浴推拿场所|温泉|汤泉|水会|水汇|浴乐|洗浴|汗蒸/.test(text)) return cost > 0 && cost < 80 ? '大众澡堂' : '洗浴中心'
  return /足疗|足浴/.test(text) ? '街边店' : '洗浴中心'
}
const normalizePlace = (place, city, index) => {
  const biz = place.biz_ext || {}
  const type = place.adminCategory || inferType(place.name, place.type, Number(biz.cost || place.cost) || 0, place)
  const location = typeof place.location === 'string' ? place.location.split(',').map(Number) : [place.location?.lng, place.location?.lat]
  const rating = Number(biz.rating || place.rating) || 0
  const price = Number(biz.cost || place.cost) || 0
  const sourceImages = (Array.isArray(place.photos) ? place.photos : []).map(photo => String(photo?.url || '').replace(/^http:\/\//i, 'https://')).filter(Boolean)
  const generatedCover = sourceImages.length < 3 ? generatedCategoryImages[type] || spaImage : null
  const images = generatedCover ? [generatedCover, ...sourceImages] : sourceImages
  const serviceLabels = [String(place.service_summary || '').split(/[|,、]/).map(value => value.trim()).filter(Boolean), place.groupbuy ? '含团购' : '', place.discount ? '有优惠' : ''].flat().filter(Boolean)
  return { id: place.id || `${city}-${place.name}-${index}`, name: place.name, type, area: place.adname || city.replace('市', ''), address: place.address || `${place.pname || city}${place.adname || ''}`, rating: rating ? rating.toFixed(1) : (place.reviewRating ? Number(place.reviewRating).toFixed(1) : null), reviews: Number(biz.rating_num || place.rating_num) || Number(place.reviewCount) || 0, price: price || null, hours: biz.open_time || null, attrs: [place.business_area, place.type?.split(';')?.[0]].filter(Boolean).slice(0, 3), features: [...serviceLabels, place.business_area, type, city.replace('市', '')].filter(Boolean), services: place.services || type, description: place.description || '', recommended: Boolean(place.recommended), hasPhotos: sourceImages.length > 0, generatedCover: Boolean(generatedCover), images: images.length ? images : [spaImage], coords: location.length === 2 ? [location[0], location[1]] : null, techs: Array.isArray(place.techs) ? place.techs.map(t => ({ name: t.name || '', title: t.title || '', images: Array.isArray(t.images) ? t.images : [], bio: t.bio || '', specialties: Array.isArray(t.specialties) ? t.specialties : [] })) : [] }
}
const distanceKm = (a, b) => {
  const rad = Math.PI / 180
  const dLat = (b[1] - a[1]) * rad, dLng = (b[0] - a[0]) * rad
  const sinLat = Math.sin(dLat / 2), sinLng = Math.sin(dLng / 2)
  return 6371 * 2 * Math.asin(Math.sqrt(sinLat ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * sinLng ** 2))
}
const amapWebUrl = place => {
  const [lng, lat] = place.coords || []
  const query = encodeURIComponent(`${place.name} ${place.address || ''}`.trim())
  return lng && lat ? `https://uri.amap.com/navigation?to=${lng},${lat},${query}&mode=car&callnative=1` : `https://www.amap.com/search?query=${query}`
}
const navigateToPlace = place => {
  const url = amapWebUrl(place)
  window.open(url, '_blank', 'noopener,noreferrer')
}
const estimateMinutes = (place, mode, origin) => {
  if (!place.coords) return null
  if (!origin) return null
  const km = distanceKm(origin, place.coords)
  const roadKm = km * 1.3
  if (mode === 'bike') return Math.max(1, Math.round((roadKm / 18) * 60 + 2))
  if (mode === 'car') return Math.max(1, Math.round((roadKm / 25) * 60 + 5))
  if (roadKm <= 1.5) return Math.max(1, Math.round((roadKm / 4.5) * 60))
  return Math.round(8 + 4 + ((roadKm - 1.5) / 20) * 60)
}

function MapView({ places, location, cityCenter, onPlaceClick, mapRef }) {
  const containerRef = React.useRef(null)
  const markersRef = React.useRef([])
  const userMarkerRef = React.useRef(null)
  const [mapState, setMapState] = useState('loading')
  useEffect(() => {
    let disposed = false
    let map
    const key = process.env.NEXT_PUBLIC_AMAP_KEY
    const securityJsCode = process.env.NEXT_PUBLIC_AMAP_SECURITY_JS_CODE
    if (!key) { setMapState('fallback'); return }
    if (securityJsCode) window._AMapSecurityConfig = { securityJsCode }
    import('@amap/amap-jsapi-loader').then(({ default: AMapLoader }) => AMapLoader.load({ key, version: '2.0', plugins: ['AMap.PlaceSearch'] })).then(AMap => {
      if (disposed || !containerRef.current) return
      map = new AMap.Map(containerRef.current, { zoom: 13, center: cityCenter, viewMode: '2D', mapStyle: 'amap://styles/normal', resizeEnable: true })
      mapRef.current = { map, AMap }
      setMapState('ready')
    }).catch(() => { if (!disposed) setMapState('fallback') })
    return () => { disposed = true; map?.destroy(); mapRef.current = null }
  }, [mapRef])
  useEffect(() => {
    const sdk = mapRef.current
    if (!sdk || mapState !== 'ready') return
    const { map, AMap } = sdk
    if (markersRef.current.length) map.remove(markersRef.current)
    places.filter(place => place.coords).forEach(place => {
      const marker = new AMap.Marker({
        position: place.coords,
        title: `${place.name} · ${place.minutes} 分钟可达`,
        anchor: 'bottom-center',
        content: `<button class="amap-store-marker" type="button"><span>${escapeHtml(place.name.split(/[·.]/)[0])}</span><b>${place.minutes} 分</b></button>`,
      })
      marker.on('click', () => onPlaceClick(place))
      map.add(marker)
      markersRef.current.push(marker)
    })
    if (!location?.coords) {
      if (markersRef.current.length) map.setFitView(markersRef.current, false, [48, 48, 48, 48])
      else map.setCenter(cityCenter)
    }
  }, [places, location?.coords, mapState, onPlaceClick, mapRef, cityCenter])
  useEffect(() => {
    const sdk = mapRef.current
    if (!sdk || !location?.coords || mapState !== 'ready') return
    const { map, AMap } = sdk
    const gpsPosition = [location.coords.lng, location.coords.lat]
    const showUserPosition = position => {
      map.setZoomAndCenter(13, position)
      if (userMarkerRef.current) map.remove(userMarkerRef.current)
      userMarkerRef.current = new AMap.Marker({ position, title: '我的位置', zIndex: 200, content: '<span class="amap-user-marker"></span>', anchor: 'center' })
      map.add(userMarkerRef.current)
    }
    showUserPosition(gpsPosition)
    if (typeof AMap.convertFrom === 'function') {
      try {
        AMap.convertFrom(gpsPosition, 'gps', ({ info, locations }) => {
          if (info === 'ok' && locations?.[0]) showUserPosition(locations[0])
        })
      } catch { /* Raw GPS coordinates already recenter the map if conversion is unavailable. */ }
    }
  }, [location?.coords, mapState, mapRef])
  if (mapState === 'fallback') {
    const visiblePlaces = places.filter(place => place.coords).slice(0, 18)
    const spread = 0.12
    const markerPosition = place => {
      const lng = place.coords?.[0] ?? cityCenter[0]
      const lat = place.coords?.[1] ?? cityCenter[1]
      return {
        left: `${Math.max(8, Math.min(92, 50 + ((lng - cityCenter[0]) / spread) * 42))}%`,
        top: `${Math.max(12, Math.min(88, 50 - ((lat - cityCenter[1]) / spread) * 42))}%`,
      }
    }
    return <div className="map-canvas map-fallback" aria-label="附近门店地图预览">
      <div className="fallback-grid" aria-hidden="true" />
      <div className="fallback-road road-a" aria-hidden="true" /><div className="fallback-road road-b" aria-hidden="true" /><div className="fallback-road road-c" aria-hidden="true" />
      <div className="fallback-title"><MapPin size={14}/><span>{cityCenter ? '附近门店地图预览' : '附近门店'}</span></div>
      {visiblePlaces.map(place => <button key={place.id} className="fallback-marker" style={markerPosition(place)} onClick={() => onPlaceClick(place)} title={place.name}><MapPin size={16}/><span>{place.minutes} 分</span></button>)}
      {location?.coords && <span className="fallback-user-marker" style={markerPosition({ coords: [location.coords.lng, location.coords.lat] })} title="我的位置" />}
      <div className="fallback-note">附近门店预览 · 可点击门店查看详情</div>
    </div>
  }
  return <div className="map-canvas" ref={containerRef} aria-label="高德地图" />
}

function Modal({ children, onClose, className = '' }) {
  useEffect(() => { const key = e => e.key === 'Escape' && onClose(); window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key) }, [onClose])
  return <div className="backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}><section className={`modal ${className}`} role="dialog" aria-modal="true">{children}</section></div>
}

function App() {
  const [mode, setMode] = useState('transit'), [category, setCategory] = useState('全部'), [query, setQuery] = useState(''), [filtersOpen, setFiltersOpen] = useState(false), [timeLimit, setTimeLimit] = useState(30), [timeMenuOpen, setTimeMenuOpen] = useState(false), [sortBy, setSortBy] = useState('distance'), [recommendedOnly, setRecommendedOnly] = useState(false), [recommendRefined, setRecommendRefined] = useState(false)
  const [city, setCity] = useState(targetCities[0]), [placeData, setPlaceData] = useState([]), [placesStatus, setPlacesStatus] = useState('loading')
  const [favorites, setFavorites] = useState(() => readStore('washjoy:favorites', [])), [reviews, setReviews] = useState(() => readStore('washjoy:reviews', [])), [submissions, setSubmissions] = useState(() => readStore('washjoy:submissions', []))
  const [detail, setDetail] = useState(null), [tech, setTech] = useState(null), [userTab, setUserTab] = useState('favorites'), [userOpen, setUserOpen] = useState(false), [view, setView] = useState('home'), [toast, setToast] = useState('')
  const [locationState, setLocationState] = useState({ status: 'idle', label: '南京市' }), [visibleCount, setVisibleCount] = useState(30), [dataRefreshTick, setDataRefreshTick] = useState(0)
  const [gallery, setGallery] = useState(0), [techGallery, setTechGallery] = useState(0), [reviewText, setReviewText] = useState(''), [reviewRating, setReviewRating] = useState(5)
  const [placeReviews, setPlaceReviews] = useState([]), [myReviews, setMyReviews] = useState([]), [authUser, setAuthUser] = useState(null), [loginPrompt, setLoginPrompt] = useState(false)
  const [originalImageOpen, setOriginalImageOpen] = useState(false)
  const lastGallerySwipe = React.useRef(0)
  const notify = message => { setToast(message); window.clearTimeout(notify.timer); notify.timer = window.setTimeout(() => setToast(''), 2200) }
  const startReview = () => { if (!authUser) { setLoginPrompt(true); return } document.querySelector('.review-form textarea')?.focus() }
  const chooseMode = value => { if (recommendedOnly) setRecommendRefined(true); setMode(value) }
  const chooseCategory = value => { if (recommendedOnly) setRecommendRefined(true); setCategory(value) }
  useEffect(() => { fetch(`${APP_BASE}api/auth/me`, { credentials: 'same-origin' }).then(r => r.ok ? r.json() : null).then(u => setAuthUser(u)).catch(() => {}) }, [])
  useEffect(() => { if (!authUser) { setMyReviews([]); return } fetch(`${APP_BASE}api/reviews/mine`, { credentials: 'same-origin' }).then(r => r.ok ? r.json() : { reviews: [] }).then(d => setMyReviews(d.reviews || [])).catch(() => {}) }, [authUser, userOpen])
  const locateUser = () => {
    if (!window.isSecureContext) { setLocationState({ status: 'error', label: '需要安全连接才能定位' }); notify('请使用 HTTPS 访问后再开启定位'); return }
    if (!navigator.geolocation) { setLocationState({ status: 'error', label: '当前浏览器不支持定位' }); notify('当前浏览器不支持定位'); return }
    setLocationState({ status: 'loading', label: '正在获取当前位置…' })
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const lat = coords.latitude.toFixed(4), lng = coords.longitude.toFixed(4)
        setLocationState({ status: 'success', label: `已定位 · ${lat}, ${lng}`, city: closestCity(coords).name, coords: { lat: coords.latitude, lng: coords.longitude } })
        setCity(closestCity(coords).name)
        notify('已获取当前位置，附近推荐将以此为中心')
      },
      error => {
        const message = error.code === 1 ? '请允许浏览器访问定位权限' : error.code === 3 ? '定位超时，请检查系统定位后重试' : '暂时无法获取当前位置，请稍后重试'
        setLocationState({ status: 'error', label: error.code === 1 ? '定位权限被拒绝' : '定位不可用' }); notify(message)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    )
  }
  const mapRef = React.useRef(null)
  useEffect(() => {
    let channel
    const refresh = () => setDataRefreshTick(t => t + 1)
    const onStorage = event => { if (event.key === 'washjoy:data-updated') refresh() }
    window.addEventListener('storage', onStorage)
    window.addEventListener('washjoy:data-updated', refresh)
    if ('BroadcastChannel' in window) { channel = new BroadcastChannel('washjoy-data'); channel.onmessage = refresh }
    const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onVisible)
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') refresh() }, 20000)
    return () => { window.removeEventListener('storage', onStorage); window.removeEventListener('washjoy:data-updated', refresh); document.removeEventListener('visibilitychange', onVisible); window.clearInterval(timer); channel?.close() }
  }, [])
  useEffect(() => {
    let cancelled = false
    setPlacesStatus('loading')
    fetch(`${APP_BASE}api/public-data?city=${citySlugs[city]}`).then(response => {
      if (!response.ok) throw new Error(`高德门店数据加载失败：${city}`)
      return response.json()
    }).then(data => {
      if (cancelled) return
      const unique = new Map()
      ;(Array.isArray(data.pois) ? data.pois : []).forEach((poi, index) => {
        try { const normalized = normalizePlace(poi, city, index); unique.set(normalized.id, normalized) }
        catch (error) { console.warn('高德门店数据格式异常', error, poi) }
      })
      setPlaceData([...unique.values()])
      setPlacesStatus(unique.size ? 'ready' : 'error')
      if (!locationState.coords) {
        try { mapRef.current?.map?.setCenter(cityCenters[city]) } catch (error) { console.warn('地图中心点更新失败', error) }
      }
    }).catch(error => { if (!cancelled) { console.error('高德门店数据加载失败', error); setPlaceData([]); setPlacesStatus('error') } })
    return () => { cancelled = true }
  }, [city, dataRefreshTick])
  useEffect(() => {
    if (!detail) return
    const current = placeData.find(p => p.id === detail.id)
    if (current) setDetail(current)
  }, [placeData])
  useEffect(() => { locateUser() }, [])
  const spotlight = e => { const rect = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty('--spot-x', `${e.clientX - rect.left}px`); e.currentTarget.style.setProperty('--spot-y', `${e.clientY - rect.top}px`) }
  useEffect(() => { localStorage.setItem('washjoy:favorites', JSON.stringify(favorites)) }, [favorites])
  useEffect(() => { localStorage.setItem('washjoy:reviews', JSON.stringify(reviews)) }, [reviews])
  useEffect(() => { localStorage.setItem('washjoy:submissions', JSON.stringify(submissions)) }, [submissions])
  useEffect(() => { setVisibleCount(30) }, [city, mode, category, query, sortBy, timeLimit, recommendedOnly])
  const usingApproxOrigin = !locationState.coords || locationState.city !== city
  const origin = !usingApproxOrigin ? [locationState.coords.lng, locationState.coords.lat] : cityCenters[city]
  const shown = useMemo(() => { const allRecommended = recommendedOnly && !recommendRefined; return placeData.map(p => ({ ...p, minutes: estimateMinutes(p, mode, origin), distance: origin && p.coords ? distanceKm(origin, p.coords) : Infinity })).filter(p => origin && p.minutes !== null && (allRecommended || p.minutes <= timeLimit) && (!recommendedOnly || p.recommended) && (allRecommended || category === '全部' || p.type === category) && (!query || `${p.name} ${p.type} ${p.area} ${p.attrs.join(' ')}`.toLowerCase().includes(query.toLowerCase()))).sort((a, b) => allRecommended ? a.minutes - b.minutes : sortBy === 'price' ? (a.price || Infinity) - (b.price || Infinity) : sortBy === 'time' ? a.minutes - b.minutes : a.distance - b.distance) }, [placeData, mode, origin?.[0], origin?.[1], category, query, sortBy, timeLimit, recommendedOnly, recommendRefined])
  const loadedPlaces = shown.slice(0, visibleCount)
  const userHasScrolledRef = React.useRef(false)
  useEffect(() => {
    const noteUserScroll = () => { if (window.scrollY > 0) userHasScrolledRef.current = true }
    window.addEventListener('scroll', noteUserScroll, { passive: true })
    return () => window.removeEventListener('scroll', noteUserScroll)
  }, [])
  useEffect(() => {
    if (!shown.length || visibleCount >= shown.length) return
    const sentinel = document.querySelector('.load-more-sentinel')
    if (!sentinel) return
    // Keep the first paint bounded to 30 cards. The next batch is requested only
    // once the user actually reaches the sentinel at the end of the current list.
    const observer = new IntersectionObserver(entries => { if (userHasScrolledRef.current && entries[0]?.isIntersecting) setVisibleCount(count => Math.min(count + 30, shown.length)) }, { rootMargin: '0px 0px 240px', threshold: 0.1 })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [shown.length, visibleCount])
  const detailMinutes = detail ? estimateMinutes(detail, mode, origin) : null
  const timeLabel = timeLimit === 60 ? '1 小时' : `${timeLimit} 分钟`
  const openDetail = useCallback(p => {
    setDetail(p); setGallery(0); setPlaceReviews([])
    fetch(`${APP_BASE}api/reviews?placeId=${encodeURIComponent(p.id)}`, { credentials: 'same-origin' })
      .then(r => r.ok ? r.json() : { reviews: [] })
      .then(d => setPlaceReviews(d.reviews || []))
      .catch(() => setPlaceReviews([]))
  }, [])
  const swipeGallery = (event, length) => {
    const startX = event.currentTarget.dataset.startX
    if (!startX || length < 2) return
    const delta = event.changedTouches?.[0]?.clientX - Number(startX)
    if (Math.abs(delta) < 45) return
    lastGallerySwipe.current = Date.now()
    setGallery(index => (index + (delta < 0 ? 1 : length - 1)) % length)
  }
  useEffect(() => {
    if (!detail || detail.images.length < 2) return
    const timer = window.setInterval(() => setGallery(index => (index + 1) % detail.images.length), 3800)
    return () => window.clearInterval(timer)
  }, [detail])
  const toggleFavorite = id => setFavorites(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  const addReview = async e => {
    e.preventDefault()
    if (!reviewText.trim()) return
    if (!authUser) { notify('请先登录后再发表评价'); return }
    try {
      const res = await fetch(`${APP_BASE}api/reviews`, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ placeId: detail.id, city: citySlugs[city], rating: reviewRating, text: reviewText.trim() }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw Error(data.error || `提交失败 (${res.status})`)
      setPlaceReviews(prev => [data.review, ...prev])
      setMyReviews(prev => [{ ...data.review, placeId: detail.id }, ...prev])
      setReviewText('')
      notify('评价已发布，后台可查看')
    } catch (err) { notify(err.message) }
  }
  const submitPlace = e => { e.preventDefault(); const f = new FormData(e.currentTarget); const name = String(f.get('name')).trim(); if (!name) return; const techs = String(f.get('techs') || '').split('\n').filter(Boolean).map(row => { const [tName, title, images, bio, specialties] = row.split('|'); return { name: tName, title: title || '门店技师', images: (images || '').split(';').filter(Boolean), bio: bio || '', specialties: (specialties || '').split(',').filter(Boolean) } }); setSubmissions(prev => [{ id: Date.now(), name, type: f.get('type'), area: f.get('area'), address: f.get('address'), status: '待审核', date: new Date().toLocaleDateString('zh-CN'), techs }, ...prev]); e.currentTarget.reset(); setUserTab('submissions'); notify('门店信息已提交，审核通过后展示') }
  const userPlaceList = userTab === 'favorites' ? placeData.filter(p => favorites.includes(p.id)) : []
  return <div className="app-shell" style={{ '--spa-hero': `url("${spaImage}")` }}>
    <header className="topbar"><a className="brand" href="#" onClick={e => {e.preventDefault();setView('home')}}><span className="brand-mark">W</span><span>Washjoy<small>附近好好洗</small></span></a><button className={`location ${locationState.status}`} onClick={locateUser} aria-label="获取当前位置"><span className="live-dot"/><span>{locationState.label}</span><ChevronRight size={14}/></button><button className="icon-button profile" aria-label="账号" onClick={() => { window.location.href = '/washjoy/account/' }}><UserRound size={18}/></button></header>
    <main>
      <section className="hero"><img className="hero-art" src={spaImage} alt="" aria-hidden="true"/><div><div className="eyebrow"><span/>此刻附近</div><motion.h1 initial={{opacity:0,filter:'blur(9px)',y:6}} animate={{opacity:1,filter:'blur(0px)',y:0}} transition={{duration:.5,ease:'easeOut'}}>想洗个舒服澡？</motion.h1><motion.p initial={{opacity:0,filter:'blur(7px)'}} animate={{opacity:1,filter:'blur(0px)'}} transition={{duration:.55,delay:.08,ease:'easeOut'}}>30 分钟内，找到适合你的那一间</motion.p></div><div className="open-tag"><span/> 即刻出发</div></section>
      <form className="search" onSubmit={e => {e.preventDefault();notify(query ? `已搜索“${query}”` : '显示附近全部门店')}}><Search size={18}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="搜店名、区域或想要的体验"/><button>搜附近</button></form>
      <div className="control-row">
        <div className="city-indicator"><MapPin size={15}/>{locationState.status === 'success' ? city : '开启定位后推荐附近门店'}</div>
        <button className={`filter-toggle ${filtersOpen ? 'open' : ''}`} onClick={() => setFiltersOpen(v => !v)} aria-expanded={filtersOpen}><span><SlidersHorizontal size={15}/>筛选</span><small>{category} · {mode === 'transit' ? '公交地铁' : mode === 'bike' ? '骑行' : '驾车'} · {timeLimit === 60 ? '1 小时' : `${timeLimit} 分钟`}</small><ChevronDown size={16}/></button>
      </div>
      <div className="mobile-categories" aria-label="门店类型">{categories.slice(1).map((c, i) => { const Icon = [Bath, Bath, Sparkles, Store, Bath][i]; const active = category === c; return <button key={c} className={active ? 'active' : ''} onClick={() => chooseCategory(active ? '全部' : c)}><Icon size={16}/><span>{c}</span>{active && <motion.span layoutId="mobile-category-indicator" className="tab-indicator" transition={{ type: 'spring', stiffness: 520, damping: 48 }} />}</button> })}</div>
      <div className="mobile-travel"><div className="segmented">{[['transit', <TrainFront size={16}/>, '公交地铁'], ['bike', <Bike size={16}/>, '骑行'], ['car', <CarFront size={16}/>, '驾车']].map(([key, icon, text]) => { const active = mode === key; return <button key={key} className={active ? 'active' : ''} onClick={() => chooseMode(key)}>{active && <motion.span layoutId="mobile-travel-indicator" className="segmented-indicator" transition={{ type: 'spring', stiffness: 500, damping: 46 }} />}{icon}<span>{text}</span></button> })}</div><div className="mobile-time-wrap"><button className="mobile-time" aria-haspopup="listbox" aria-expanded={timeMenuOpen} onClick={() => setTimeMenuOpen(v => !v)}><Clock3 size={15}/>{timeLimit === 60 ? '1 小时' : `${timeLimit} 分钟`}<ChevronDown size={14}/></button>{timeMenuOpen && <div className="time-menu" role="listbox" aria-label="可达时间">{timeOptions.map(minutes => <button key={minutes} role="option" aria-selected={timeLimit === minutes} className={timeLimit === minutes ? 'active' : ''} onClick={() => { setTimeLimit(minutes); setTimeMenuOpen(false) }}>{minutes === 60 ? '1 小时' : `${minutes} 分钟`}</button>)}</div>}</div></div>
      {filtersOpen && <div className="filter-row"><div className="filter-column"><span>门店类型</span><div className="categories">{categories.map(c => { const active = category === c; return <button key={c} className={active ? 'active' : ''} onClick={() => chooseCategory(c)}>{c}{active && <motion.span layoutId="filter-category-indicator" className="tab-indicator" transition={{ type: 'spring', stiffness: 500, damping: 46 }} />}</button> })}</div></div><div className="filter-column"><span>出行工具</span><div className="travel"><div className="segmented">{[['transit', <TrainFront size={14}/>, '公交地铁'], ['bike', <Bike size={14}/>, '骑行'], ['car', <CarFront size={14}/>, '驾车']].map(([key, icon, text]) => { const active = mode === key; return <button key={key} className={active ? 'active' : ''} onClick={() => chooseMode(key)}>{active && <motion.span layoutId="filter-travel-indicator" className="segmented-indicator" transition={{ type: 'spring', stiffness: 500, damping: 46 }} />}{icon}<span>{text}</span></button> })}</div></div></div></div>}
        <section className="content-grid"><div className="map-panel" onPointerMove={spotlight}><MapView places={loadedPlaces} location={locationState} cityCenter={cityCenters[city]} onPlaceClick={openDetail} mapRef={mapRef}/><div className="map-overlay"><span><span className="live-dot"/> {locationState.status === 'success' ? '当前位置已同步' : `高德地图 · ${city}`}</span><div><button aria-label="回到当前位置" onClick={locateUser}><LocateFixed size={16}/></button><button aria-label="放大地图" onClick={() => mapRef.current?.map?.zoomIn()}><Plus size={16}/></button><button aria-label="缩小地图" onClick={() => mapRef.current?.map?.zoomOut()}><Minus size={16}/></button></div></div><div className="map-legend"><span className="legend-dot"/> 门店位置 <i/> <span className="you-legend"/> 当前位置</div><div className="map-credit">高德地图 · 已加载 {loadedPlaces.length} 家</div></div>
        <section className="results"><div className="results-head"><div><h2>附近推荐</h2><span>{placesStatus === 'ready' ? `${loadedPlaces.length} / ${shown.length} 家已加载` : placesStatus === 'loading' ? '正在加载附近门店' : '附近门店暂不可用'}</span></div><div className="result-tools"><label className="sort-select"><ArrowUpDown size={14}/><select value={sortBy} onChange={e => setSortBy(e.target.value)} aria-label="排序方式"><option value="distance">距离优先</option><option value="time">通勤时间</option><option value="price">价格优先</option></select></label><button className={`recommend-toggle ${recommendedOnly ? 'active' : ''}`} onClick={() => { setRecommendedOnly(v => { const next = !v; if (!next) setRecommendRefined(false); else setRecommendRefined(false); return next }) }} aria-pressed={recommendedOnly}><Star size={14} fill={recommendedOnly ? 'currentColor' : 'none'}/><span>站长推荐</span></button></div></div><div className="rule-line">{mode === 'transit' ? `步行或公交 / 地铁 · 预计 ${timeLabel} 内` : mode === 'bike' ? `骑行 · 按 18 km/h 估算，筛选 ${timeLabel} 内` : `驾车 · 按道路预计时间筛选 ${timeLabel} 内`}</div>{usingApproxOrigin && <button className="location-hint" onClick={locateUser}><MapPin size={14}/><span>暂按{city}中心估算，开启定位可查看真实附近结果</span><span className="location-hint-cta">定位 <ChevronRight size={13}/></span></button>}<div className="place-list">{placesStatus === 'loading' ? <div className="empty">正在加载 {city} 的附近门店…</div> : shown.length ? loadedPlaces.map(p => <article className="place-card" key={p.id} onClick={() => openDetail(p)} onPointerMove={spotlight}><button className="place-photo" onClick={e => { e.stopPropagation(); openDetail(p) }}><motion.img layoutId={`place-image-${p.id}`} src={p.images[0]} alt=""/><span className="photo-count">{p.generatedCover ? '分类示意图' : p.manual ? '站长维护' : '高德门店'}</span></button><div className="place-info"><div className="place-top"><div>{p.recommended && <span className="recommended-tag"><Star size={11} fill="currentColor"/>站长推荐</span>}<span className="kind">{p.type} · {p.area}</span><button className="place-name" onClick={e => { e.stopPropagation(); openDetail(p) }}>{p.name}</button></div><button className={`favorite ${favorites.includes(p.id) ? 'on' : ''}`} aria-label={favorites.includes(p.id) ? '取消收藏' : '收藏'} onClick={e => { e.stopPropagation(); toggleFavorite(p.id) }}><Heart size={18} fill={favorites.includes(p.id) ? 'currentColor' : 'none'}/></button></div><div className="rating"><Star size={13} fill="currentColor"/><b>{p.rating || '暂无评分'}</b><span>{p.reviews ? `(${p.reviews.toLocaleString()} 条公开评价)` : p.rating ? '高德评分' : '暂无评分数据'}</span></div><div className="tags">{p.attrs.map(a => <span key={a}>{a}</span>)}</div><div className="place-bottom"><span>{p.price ? <><b>¥{p.price}</b> 起 / 人</> : '价格请咨询门店'}</span><button onClick={e => { e.stopPropagation(); openDetail(p) }}>{p.distance < 1 ? `${Math.round(p.distance * 1000)} 米` : `${p.distance.toFixed(1)} 公里`} · {p.minutes} 分钟 <ChevronRight size={14}/></button></div></div></article>) : <div className="empty">{placesStatus === 'error' ? '高德门店搜索暂时失败，请稍后重试。' : (recommendedOnly ? '本站暂未在该区域设置推荐门店；取消“站长推荐”即可查看全部结果。' : '没有找到符合条件的店，试试切换交通方式或类型。')}</div>}{shown.length > loadedPlaces.length && <div className="load-more-sentinel" aria-hidden="true"><span>继续上滑加载更多门店</span></div>}</div><p className="disclaimer">门店信息来自高德地图及站长维护；标注“分类示意图”的图片为 AI 生成，不代表该门店实拍。推荐围绕当前定位；时间按当前出行方式估算，公交地铁含步行接驳，不是实时路线规划。</p></section></section>
    </main>
    <nav className="bottom-nav"><button className={view === 'home' ? 'active' : ''} onClick={() => {setView('home');setUserOpen(false)}}><MapIcon size={19}/><span>附近</span></button><button className={view === 'favorites' ? 'active' : ''} onClick={() => {setView('favorites');setUserTab('favorites');setUserOpen(true)}}><Bookmark size={19}/><span>收藏</span></button><button className={view === 'mine' ? 'active' : ''} onClick={() => {setView('mine');setUserOpen(true)}}><UserRound size={19}/><span>我的</span></button></nav>
    {detail && <Modal className="detail-modal" onClose={() => setDetail(null)}>
      <div className="detail-cover">
        <button className="detail-image-trigger" data-start-x="" onContextMenu={e => e.preventDefault()} onTouchStart={e => { e.currentTarget.dataset.startX = e.touches[0].clientX }} onTouchEnd={e => swipeGallery(e, detail.images.length)} onClick={() => { if (Date.now() - lastGallerySwipe.current > 400) setOriginalImageOpen(true) }} aria-label="查看原图"><motion.img draggable="false" layoutId={`place-image-${detail.id}`} src={detail.images[gallery] || spaImage} alt={detail.hasPhotos ? `${detail.name}门店图片 ${gallery + 1}` : '默认温泉场景图'}/></button>
        {detail.generatedCover && <span className="photo-count">分类示意图 · AI 生成</span>}
        {!detail.hasPhotos && !detail.generatedCover && <span className="photo-count">暂无门店图片</span>}
        <button className="close-button" onClick={() => setDetail(null)} aria-label="关闭"><X size={19}/></button>
        {detail.images.length > 1 && <span className="gallery-count">自动轮播 · {gallery + 1} / {detail.images.length}</span>}
      </div>
      <div className="detail-scroll">
        <div className="detail-actions"><button className="navigate-button" onClick={() => navigateToPlace(detail)}><MapPin size={15}/>驾车导航</button><span>支持手机高德 App 接管或网页版打开</span></div>
        <span className="detail-kicker">{detail.type} · 高德门店信息</span>
        <div className="detail-heading"><div><h2>{detail.name}</h2><span className="detail-area"><MapPin size={14}/>{detail.address}</span></div>{detail.rating && <div className="detail-rating"><b><Star size={15} fill="currentColor"/>{detail.rating}</b><span>{detail.reviews ? `${detail.reviews.toLocaleString()} 条评价` : '高德评分'}</span></div>}</div>
        <div className="facts"><div>营业时间<b>{detail.hours || '暂无公开信息'}</b></div><div>参考人均<b>{detail.price ? `¥${detail.price} 起` : '暂无公开信息'}</b></div><div>当前预计到达<b>{detailMinutes === null ? '暂无坐标' : `${detailMinutes} 分钟可达`}</b></div><div>门店类别<b>{detail.services || detail.type}</b></div></div>
        <h3>服务特色</h3><div className="tags feature-tags">{detail.features.length ? detail.features.map(t => { const Icon = featureIcon(t); return <span key={t}><Icon size={13} strokeWidth={1.8}/>{t}</span> }) : <span className="muted-tag">暂无公开信息</span>}</div>
        <div className="section-heading"><h3>门店技师</h3><span>左右滑动查看更多</span></div><div className="tech-strip">{detail.techs?.length ? detail.techs.map((t, i) => <button className="tech-card" key={`${t.name}-${i}`} onClick={() => {setTech(t);setTechGallery(0)}}><img src={t.images?.[0] || spaImage} alt={t.name}/><b>{t.name}</b><small>{t.title}</small></button>) : <span className="muted">暂无技师资料</span>}</div>
        {detail.description && <><div className="section-heading"><h3>门店介绍</h3><span>站长维护</span></div><p className="detail-description">{detail.description}</p></>}
        <div className="section-heading"><h3>门店评价</h3><span>{placeReviews.length ? `${placeReviews.length} 条本站评价` : '暂无本站评价'}</span></div>
        <div className="review-list">{placeReviews.length ? placeReviews.map(r => <article className="review-item" key={r.id}><div className="review-top"><b>{r.author}</b><span>{'★'.repeat(r.rating)}</span><small>{new Date(r.created * 1000).toLocaleDateString('zh-CN')}</small></div><p>{r.text}</p></article>) : <div className="review-empty"><MessageSquareText size={20}/><span>还没有本站评价{detail.rating ? `，高德公开评分 ${detail.rating}` : ''}</span></div>}</div>
        <div className="section-heading"><h3>写一条评价</h3><span>分享真实到店体验</span></div>{authUser ? <form className="review-form" onSubmit={addReview}><select value={reviewRating} onChange={e => setReviewRating(Number(e.target.value))}>{[5,4,3,2,1].map(n => <option key={n} value={n}>{'★'.repeat(n)}{'☆'.repeat(5-n)} {['','不满意','一般','还可以','满意','很满意'][n]}</option>)}</select><textarea required value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder="环境、服务或体验都可以写下来"/><button><Send size={14}/>发布评价</button></form> : <div className="review-login"><span>登录后即可发表评价，发布后会同步到后台</span><a href="/washjoy/account">去登录</a></div>}<p className="source-note">门店基础信息来自高德公开数据；本站评价保存在服务器，门店管理后台可以查看。</p>
      </div>
      <div className="detail-footer"><button className="detail-review-cta" onClick={startReview}><MessageSquareText size={17}/>写一条评价</button><button className="detail-book-cta" onClick={() => notify('预约功能即将开放')}><Bath size={17}/>立即预约</button></div>
    </Modal>}
    {originalImageOpen && detail && <Modal className="image-viewer-modal" onClose={() => setOriginalImageOpen(false)}>
      <div className="lightbox-stage" data-start-x="" onContextMenu={e => e.preventDefault()} onTouchStart={e => { e.currentTarget.dataset.startX = e.touches[0].clientX }} onTouchEnd={e => swipeGallery(e, detail.images.length)}><motion.img draggable="false" layoutId={`place-image-${detail.id}`} className="original-image" src={detail.images[gallery] || spaImage} alt={`${detail.name}原始图片 ${gallery + 1}`}/></div>
      <button className="close-button" onClick={() => setOriginalImageOpen(false)} aria-label="关闭原图"><X size={19}/></button>
      {detail.images.length > 1 && <span className="gallery-count">左右滑动 · {gallery + 1} / {detail.images.length}</span>}
    </Modal>}
    {tech && <Modal className="tech-modal" onClose={() => setTech(null)}><div className="tech-cover"><img src={tech.images[techGallery] || spaImage} alt={tech.name}/><button className="close-button" onClick={() => setTech(null)} aria-label="关闭"><X size={19}/></button>{tech.images.length > 1 && <><button className="gallery-arrow prev" aria-label="上一张技师照片" onClick={() => setTechGallery(i => (i + tech.images.length - 1) % tech.images.length)}><ChevronLeft/></button><button className="gallery-arrow next" aria-label="下一张技师照片" onClick={() => setTechGallery(i => (i + 1) % tech.images.length)}><ChevronRight/></button><span className="gallery-count">{techGallery + 1} / {tech.images.length}</span></>}</div><div className="tech-detail"><span className="detail-kicker">门店服务团队</span><h2>{tech.name}</h2><span className="tech-title">{tech.title}</span><div className="tags">{tech.specialties.map(s => <span key={s}>{s}</span>)}</div><h3>技师介绍</h3><p>{tech.bio || '暂无详细介绍'}</p><small>技师资料由门店提交并经审核后展示。</small></div></Modal>}
    {loginPrompt && <Modal className="login-prompt-modal" onClose={() => setLoginPrompt(false)}><div className="login-prompt-icon"><MessageSquareText size={22}/></div><h2>登录后写评价</h2><p>登录后才能发布评价，评价会同步保存到你的账号和门店后台。</p><div className="login-prompt-actions"><button className="login-prompt-cancel" onClick={() => setLoginPrompt(false)}>稍后再说</button><a className="login-prompt-go" href="/washjoy/account">去登录 <ChevronRight size={16}/></a></div></Modal>}
    {userOpen && <Modal className="user-modal" onClose={() => setUserOpen(false)}><div className="user-head"><div><span className="detail-kicker">WASHJOY</span><h2>我的</h2></div><button className="close-lite" onClick={() => setUserOpen(false)} aria-label="关闭"><X/></button></div><div className="user-tabs">{[['favorites','我的收藏'],['reviews','我的评价'],['submissions','我的提交']].map(([id, title]) => { const active = userTab === id; return <button key={id} className={active ? 'active' : ''} onClick={() => setUserTab(id)}>{active && <motion.span layoutId="user-tab-indicator" className="user-tab-indicator" transition={{ type: 'spring', stiffness: 500, damping: 46 }} />}<span>{title}</span></button> })}</div>{userTab === 'favorites' && <div className="user-list">{userPlaceList.length ? userPlaceList.map(p => <div className="user-row" key={p.id}><div><b>{p.name}</b><small>{p.type} · {p.area} · {p.rating} 分</small></div><button onClick={() => {setUserOpen(false);openDetail(p)}}>查看门店</button></div>) : <div className="user-empty"><Heart size={22}/><span>收藏的门店会显示在这里</span></div>}</div>}{userTab === 'reviews' && <div className="user-list">{myReviews.length ? myReviews.map(r => <div className="user-row review-row" key={r.id}><div><b>{r.placeName} <span>{'★'.repeat(r.rating)}</span></b><small>{new Date(r.created * 1000).toLocaleDateString('zh-CN')} · {r.text}</small></div><button onClick={() => {setUserOpen(false);openDetail(placeData.find(p => p.id === r.placeId) || placeData[0])}}>查看门店</button></div>) : <div className="user-empty"><MessageSquareText size={22}/><span>{authUser ? '你还没有发表过评价' : '登录后发表的评价会显示在这里'}</span></div>}</div>}{userTab === 'submissions' && <><div className="user-list">{submissions.length ? submissions.map(s => <div className="user-row" key={s.id}><div><b>{s.name}</b><small>{s.type} · {s.area} · {s.date}</small></div><span className="status">{s.status}</span></div>) : <div className="user-empty"><Bath size={22}/><span>提交的门店及审核状态会显示在这里</span></div>}</div><h3 className="form-title">提交新门店</h3><form className="submit-form" onSubmit={submitPlace}><input name="name" required placeholder="门店名称"/><div className="form-pair"><select name="type" defaultValue="洗浴中心">{categories.slice(1).map(c => <option key={c}>{c}</option>)}</select><input name="area" placeholder="所在区域"/></div><input name="address" placeholder="详细地址"/><textarea name="techs" placeholder={'技师资料（每行一位）\n姓名|岗位|图片地址1;图片地址2|简介|擅长项目,项目二'}/><button className="submit-button">提交审核 <ChevronRight size={15}/></button><p className="submit-note">提交后进入待审核状态。审核通过后门店及技师信息会展示在附近列表中。技师图片可填写图片链接，多个图片用分号分隔。</p></form></>}</Modal>}
    <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
  </div>
}

export default App
