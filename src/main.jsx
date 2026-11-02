import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import AMapLoader from '@amap/amap-jsapi-loader'
import { Heart, MapPin, Search, UserRound, LocateFixed, Plus, Minus, Star, ChevronLeft, ChevronRight, X, Map as MapIcon, Bookmark, MessageSquareText, Send, Clock3, TrainFront, Bike, CarFront, Bath, ArrowUpDown, SlidersHorizontal, ChevronDown, Snowflake, MessageCircle, Store, Sparkles } from 'lucide-react'
import './styles.css'

const OSS_ASSET_BASE = 'https://fehd.oss-cn-shanghai.aliyuncs.com/washjoy/assets'
const spaImage = `${OSS_ASSET_BASE}/washjoy-spa-hero.webp`
const targetCities = ['南京市', '扬州市', '镇江市']
const citySlugs = { 南京市: 'nanjing', 扬州市: 'yangzhou', 镇江市: 'zhenjiang' }
const cityCenters = { 南京市: [118.7969, 32.0603], 扬州市: [119.4129, 32.3942], 镇江市: [119.425, 32.1878] }
const categories = ['全部', '洗浴中心', '大众澡堂', '足疗会所', '街边店', '私汤']
const featureIcon = label => /冷却|冰|降温/.test(label) ? Snowflake : /教诲|聊天|交流|沟通/.test(label) ? MessageCircle : /街边店|澡堂|洗浴中心|足疗会所|私汤/.test(label) ? Store : /南京|扬州|镇江|区域|位置/.test(label) ? MapPin : Sparkles
const readStore = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback } }
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
const inferType = (name, type = '') => {
  const explicit = String(type).split(/[;,]/).map(value => value.trim()).find(value => categories.includes(value) && value !== '全部')
  return explicit || (/足疗|足艺|按摩|采耳/.test(`${name}${type}`) ? '足疗会所' : /私汤/.test(name) ? '私汤' : /澡堂|浴场/.test(name) ? '大众澡堂' : /街边|社区/.test(name) ? '街边店' : '洗浴中心')
}
const normalizePlace = (place, city, index) => {
  const type = inferType(place.name, place.type)
  const biz = place.biz_ext || {}
  const location = place.location?.split(',').map(Number) || []
  const rating = Number(biz.rating) || 0
  const price = Number(biz.cost) || 0
  const images = (Array.isArray(place.photos) ? place.photos : []).map(photo => String(photo?.url || '').replace(/^http:\/\//i, 'https://')).filter(Boolean)
  const serviceLabels = String(place.service_summary || '').split(/[|,、]/).map(value => value.trim()).filter(Boolean)
  return { id: place.id || `${city}-${place.name}-${index}`, name: place.name, type, area: place.adname || city.replace('市', ''), address: place.address || `${place.pname || city}${place.adname || ''}`, rating: rating ? rating.toFixed(1) : null, reviews: Number(biz.rating_num) || 0, price: price || null, hours: biz.open_time || null, attrs: [place.business_area, place.type?.split(';')?.[0]].filter(Boolean).slice(0, 3), features: [...serviceLabels, place.business_area, type, city.replace('市', '')].filter(Boolean), services: type, reviewText: null, hasPhotos: images.length > 0, images: images.length ? images : [spaImage], coords: location.length === 2 ? [location[0], location[1]] : null, techs: [] }
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
  const km = distanceKm(origin, place.coords)
  if (mode === 'bike') return Math.round(km * 1.25 / 25 * 60)
  if (mode === 'car') return Math.round(km * 1.4 / 28 * 60)
  // 公交地铁模式覆盖纯步行，以及步行接驳公共交通的 30 分钟范围。
  if (km <= 2.5) return Math.max(1, Math.round(km / 5 * 60))
  return Math.round((km * 1.35 / 18) * 60 + 8)
}

function MapView({ places, location, cityCenter, onPlaceClick, mapRef }) {
  const containerRef = React.useRef(null)
  const markersRef = React.useRef([])
  const userMarkerRef = React.useRef(null)
  const [mapState, setMapState] = useState('loading')
  useEffect(() => {
    let disposed = false
    let map
    const key = import.meta.env.VITE_AMAP_KEY
    const securityJsCode = import.meta.env.VITE_AMAP_SECURITY_JS_CODE
    if (!key) { setMapState('fallback'); return }
    if (securityJsCode) window._AMapSecurityConfig = { securityJsCode }
    AMapLoader.load({ key, version: '2.0', plugins: ['AMap.PlaceSearch'] }).then(AMap => {
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
      map.setZoomAndCenter(15, position)
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
  const [mode, setMode] = useState('transit'), [category, setCategory] = useState('全部'), [query, setQuery] = useState(''), [sort, setSort] = useState(false), [filtersOpen, setFiltersOpen] = useState(false)
  const [city, setCity] = useState(targetCities[0]), [placeData, setPlaceData] = useState([]), [placesStatus, setPlacesStatus] = useState('loading')
  const [favorites, setFavorites] = useState(() => readStore('washjoy:favorites', [])), [reviews, setReviews] = useState(() => readStore('washjoy:reviews', [])), [submissions, setSubmissions] = useState(() => readStore('washjoy:submissions', []))
  const [detail, setDetail] = useState(null), [tech, setTech] = useState(null), [userTab, setUserTab] = useState('favorites'), [userOpen, setUserOpen] = useState(false), [view, setView] = useState('home'), [toast, setToast] = useState('')
  const [locationState, setLocationState] = useState({ status: 'idle', label: '南京市' })
  const [gallery, setGallery] = useState(0), [techGallery, setTechGallery] = useState(0), [reviewText, setReviewText] = useState(''), [reviewRating, setReviewRating] = useState(5)
  const [originalImageOpen, setOriginalImageOpen] = useState(false)
  const lastGallerySwipe = React.useRef(0)
  const notify = message => { setToast(message); window.clearTimeout(notify.timer); notify.timer = window.setTimeout(() => setToast(''), 2200) }
  const locateUser = () => {
    if (!window.isSecureContext) { setLocationState({ status: 'error', label: '需要安全连接才能定位' }); notify('请使用 HTTPS 访问后再开启定位'); return }
    if (!navigator.geolocation) { setLocationState({ status: 'error', label: '当前浏览器不支持定位' }); notify('当前浏览器不支持定位'); return }
    setLocationState({ status: 'loading', label: '正在获取当前位置…' })
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const lat = coords.latitude.toFixed(4), lng = coords.longitude.toFixed(4)
        setLocationState({ status: 'success', label: `已定位 · ${lat}, ${lng}`, coords: { lat: coords.latitude, lng: coords.longitude } })
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
    let cancelled = false
    setPlacesStatus('loading')
    fetch(`${import.meta.env.BASE_URL}data/${citySlugs[city]}.json`).then(response => {
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
  }, [city])
  useEffect(() => { locateUser() }, [])
  const spotlight = e => { const rect = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty('--spot-x', `${e.clientX - rect.left}px`); e.currentTarget.style.setProperty('--spot-y', `${e.clientY - rect.top}px`) }
  useEffect(() => { localStorage.setItem('washjoy:favorites', JSON.stringify(favorites)) }, [favorites])
  useEffect(() => { localStorage.setItem('washjoy:reviews', JSON.stringify(reviews)) }, [reviews])
  useEffect(() => { localStorage.setItem('washjoy:submissions', JSON.stringify(submissions)) }, [submissions])
  const origin = locationState.coords ? [locationState.coords.lng, locationState.coords.lat] : cityCenters[city]
  const shown = useMemo(() => placeData.map(p => ({ ...p, minutes: estimateMinutes(p, mode, origin) })).filter(p => p.minutes !== null && p.minutes <= 30 && (category === '全部' || p.type === category) && (!query || `${p.name} ${p.type} ${p.area} ${p.attrs.join(' ')}`.toLowerCase().includes(query.toLowerCase()))).sort((a, b) => sort ? b.minutes - a.minutes : a.minutes - b.minutes), [placeData, mode, origin[0], origin[1], category, query, sort])
  const detailMinutes = detail ? estimateMinutes(detail, mode, origin) : null
  const openDetail = useCallback(p => { setDetail(p); setGallery(0) }, [])
  const toggleFavorite = id => setFavorites(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  const addReview = e => { e.preventDefault(); if (!reviewText.trim()) return; setReviews(prev => [{ id: Date.now(), placeId: detail.id, placeName: detail.name, rating: reviewRating, text: reviewText.trim(), date: new Date().toLocaleDateString('zh-CN') }, ...prev]); setReviewText(''); setDetail(null); setUserTab('reviews'); setUserOpen(true); notify('评价已保存到我的评价') }
  const submitPlace = e => { e.preventDefault(); const f = new FormData(e.currentTarget); const name = String(f.get('name')).trim(); if (!name) return; const techs = String(f.get('techs') || '').split('\n').filter(Boolean).map(row => { const [tName, title, images, bio, specialties] = row.split('|'); return { name: tName, title: title || '门店技师', images: (images || '').split(';').filter(Boolean), bio: bio || '', specialties: (specialties || '').split(',').filter(Boolean) } }); setSubmissions(prev => [{ id: Date.now(), name, type: f.get('type'), area: f.get('area'), address: f.get('address'), status: '待审核', date: new Date().toLocaleDateString('zh-CN'), techs }, ...prev]); e.currentTarget.reset(); setUserTab('submissions'); notify('门店信息已提交，审核通过后展示') }
  const userPlaceList = userTab === 'favorites' ? placeData.filter(p => favorites.includes(p.id)) : []
  return <div className="app-shell" style={{ '--spa-hero': `url("${spaImage}")` }}>
    <header className="topbar"><a className="brand" href="#" onClick={e => {e.preventDefault();setView('home')}}><span className="brand-mark">W</span><span>Washjoy<small>附近好好洗</small></span></a><button className={`location ${locationState.status}`} onClick={locateUser} aria-label="获取当前位置"><span className="live-dot"/><span>{locationState.label}</span><ChevronRight size={14}/></button><button className="icon-button profile" aria-label="我的" onClick={() => setUserOpen(true)}><UserRound size={18}/></button></header>
    <main>
      <section className="hero"><div><div className="eyebrow"><span/>此刻附近</div><h1>想洗个舒服澡？</h1><p>30 分钟内，找到适合你的那一间</p></div><div className="open-tag"><span/> 即刻出发</div></section>
      <form className="search" onSubmit={e => {e.preventDefault();notify(query ? `已搜索“${query}”` : '显示附近全部门店')}}><Search size={18}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="搜店名、区域或想要的体验"/><button>搜附近</button></form>
      <div className="control-row">
        <div className="city-select"><MapPin size={15}/><select aria-label="选择城市" value={city} onChange={e => setCity(e.target.value)}>{targetCities.map(c => <option key={c}>{c}</option>)}</select></div>
        <button className={`filter-toggle ${filtersOpen ? 'open' : ''}`} onClick={() => setFiltersOpen(v => !v)} aria-expanded={filtersOpen}><span><SlidersHorizontal size={15}/>筛选</span><small>{category} · {mode === 'transit' ? '公交地铁' : mode === 'bike' ? '骑行' : '驾车'} · 30 分钟</small><ChevronDown size={16}/></button>
      </div>
      {filtersOpen && <div className="filter-row"><div className="filter-column"><span>门店类型</span><div className="categories">{categories.map(c => <button key={c} className={category === c ? 'active' : ''} onClick={() => setCategory(c)}>{c}</button>)}</div></div><div className="filter-column"><span>出行工具</span><div className="travel"><div className="segmented">{[['transit', <TrainFront size={14}/>, '公交地铁'], ['bike', <Bike size={14}/>, '骑行'], ['car', <CarFront size={14}/>, '驾车']].map(([key, icon, text]) => <button key={key} className={mode === key ? 'active' : ''} onClick={() => setMode(key)}>{icon}<span>{text}</span></button>)}</div></div></div></div>}
        <section className="content-grid"><div className="map-panel" onPointerMove={spotlight}><MapView places={shown} location={locationState} cityCenter={cityCenters[city]} onPlaceClick={openDetail} mapRef={mapRef}/><div className="map-overlay"><span><span className="live-dot"/> {locationState.status === 'success' ? '当前位置已同步' : `高德地图 · ${city}`}</span><div><button aria-label="回到当前位置" onClick={locateUser}><LocateFixed size={16}/></button><button aria-label="放大地图" onClick={() => mapRef.current?.map?.zoomIn()}><Plus size={16}/></button><button aria-label="缩小地图" onClick={() => mapRef.current?.map?.zoomOut()}><Minus size={16}/></button></div></div><div className="map-legend"><span className="legend-dot"/> 门店位置 <i/> <span className="you-legend"/> 当前位置</div><div className="map-credit">门店信息来自高德地图</div></div>
        <section className="results"><div className="results-head"><div><h2>附近推荐</h2><span>{placesStatus === 'ready' ? `${shown.length} 家符合条件` : placesStatus === 'loading' ? '正在从高德加载' : '高德暂时没有返回结果'}</span></div><button className="sort-button" onClick={() => setSort(v => !v)}><ArrowUpDown size={14}/>距离{sort ? '较远' : '较近'}</button></div><div className="rule-line">{mode === 'transit' ? '步行或公交 / 地铁 · 预计 30 分钟内' : mode === 'bike' ? '骑行 · 按 25 km/h 估算，筛选 30 分钟内' : '驾车 · 按道路预计时间筛选 30 分钟内'}</div><div className="place-list">{placesStatus === 'loading' ? <div className="empty">正在加载 {city} 的高德门店信息…</div> : shown.length ? shown.map(p => <article className="place-card" key={p.id} onClick={() => openDetail(p)} onPointerMove={spotlight}><button className="place-photo" onClick={() => openDetail(p)}><img src={p.images[0]} alt=""/><span className="photo-count">高德门店</span></button><div className="place-info"><div className="place-top"><div><span className="kind">{p.type} · {p.area}</span><button className="place-name" onClick={() => openDetail(p)}>{p.name}</button></div><button className={`favorite ${favorites.includes(p.id) ? 'on' : ''}`} aria-label={favorites.includes(p.id) ? '取消收藏' : '收藏'} onClick={e => { e.stopPropagation(); toggleFavorite(p.id) }}><Heart size={18} fill={favorites.includes(p.id) ? 'currentColor' : 'none'}/></button></div><div className="rating"><Star size={13} fill="currentColor"/><b>{p.rating || '暂无评分'}</b><span>{p.reviews ? `(${p.reviews.toLocaleString()} 条公开评价)` : '暂无公开评价'}</span></div><div className="tags">{p.attrs.map(a => <span key={a}>{a}</span>)}</div><div className="place-bottom"><span>{p.price ? <><b>¥{p.price}</b> 起 / 人</> : '价格请咨询门店'}</span><button onClick={() => openDetail(p)}>{p.minutes} 分钟可达 <ChevronRight size={14}/></button></div></div></article>) : <div className="empty">{placesStatus === 'error' ? '高德门店搜索暂时失败，请稍后重试。' : '没有找到符合条件的店，试试切换交通方式或类型。'}</div>}</div><p className="disclaimer">门店名称、地址、图片与公开评价来自高德地图；预计时间为基于距离的估算，不代表实时路线。</p></section></section>
    </main>
    <nav className="bottom-nav"><button className={view === 'home' ? 'active' : ''} onClick={() => {setView('home');setUserOpen(false)}}><MapIcon size={19}/>附近</button><button className={view === 'favorites' ? 'active' : ''} onClick={() => {setView('favorites');setUserTab('favorites');setUserOpen(true)}}><Bookmark size={19}/>收藏</button><button onClick={() => {setView('mine');setUserOpen(true)}}><UserRound size={19}/>我的</button></nav>
    {detail && <Modal className="detail-modal" onClose={() => setDetail(null)}>
      <div className="detail-cover" onTouchStart={e => { detail.touchX = e.touches[0].clientX }} onTouchEnd={e => { const delta = e.changedTouches[0].clientX - detail.touchX; if (Math.abs(delta) > 40) { lastGallerySwipe.current = Date.now(); setGallery(i => (i + (delta < 0 ? 1 : detail.images.length - 1)) % detail.images.length) } }}>
        <button className="detail-image-trigger" onClick={() => { if (Date.now() - lastGallerySwipe.current > 400) setOriginalImageOpen(true) }} aria-label="查看原图"><img src={detail.images[gallery] || spaImage} alt={detail.hasPhotos ? `${detail.name}门店图片 ${gallery + 1}` : '默认温泉场景图'}/></button>
        {!detail.hasPhotos && <span className="photo-count">暂无门店图片</span>}
        <button className="close-button" onClick={() => setDetail(null)} aria-label="关闭"><X size={19}/></button>
        {detail.images.length > 1 && <><button className="gallery-arrow prev" aria-label="上一张" onClick={() => setGallery(i => (i + detail.images.length - 1) % detail.images.length)}><ChevronLeft/></button><button className="gallery-arrow next" aria-label="下一张" onClick={() => setGallery(i => (i + 1) % detail.images.length)}><ChevronRight/></button><span className="gallery-count">{gallery + 1} / {detail.images.length}</span></>}
      </div>
      <div className="detail-scroll">
        <div className="detail-actions"><button className="navigate-button" onClick={() => navigateToPlace(detail)}><MapPin size={15}/>打开高德导航</button><span>支持手机高德 App 接管或网页版打开</span></div>
        <span className="detail-kicker">{detail.type} · 高德门店信息</span>
        <div className="detail-heading"><div><h2>{detail.name}</h2><span className="detail-area"><MapPin size={14}/>{detail.address}</span></div>{detail.rating && <div className="detail-rating"><b><Star size={15} fill="currentColor"/>{detail.rating}</b><span>{detail.reviews ? `${detail.reviews.toLocaleString()} 条评价` : '高德评分'}</span></div>}</div>
        <div className="facts"><div>营业时间<b>{detail.hours || '暂无公开信息'}</b></div><div>参考人均<b>{detail.price ? `¥${detail.price} 起` : '暂无公开信息'}</b></div><div>当前预计到达<b>{detailMinutes === null ? '暂无坐标' : `${detailMinutes} 分钟可达`}</b></div><div>门店类别<b>{detail.services || detail.type}</b></div></div>
        <h3>服务特色</h3><div className="tags feature-tags">{detail.features.length ? detail.features.map(t => { const Icon = featureIcon(t); return <span key={t}><Icon size={13} strokeWidth={1.8}/>{t}</span> }) : <span className="muted-tag">暂无公开信息</span>}</div>
        <div className="section-heading"><h3>门店技师</h3><span>左右滑动查看更多</span></div><div className="tech-strip"><span className="muted">高德地点搜索未提供技师资料</span></div>
        <div className="section-heading"><h3>公开评价</h3><span>{detail.reviews ? `${detail.reviews.toLocaleString()} 条` : '暂无公开评价数据'}</span></div><div className="public-review"><p>高德地点搜索未提供评价正文，请打开高德地图查看该门店的最新公开评价。</p><small>来源：高德地图地点搜索</small></div>
        <div className="section-heading"><h3>写一条评价</h3><span>分享真实到店体验</span></div><form className="review-form" onSubmit={addReview}><select value={reviewRating} onChange={e => setReviewRating(Number(e.target.value))}>{[5,4,3,2,1].map(n => <option key={n} value={n}>{'★'.repeat(n)}{'☆'.repeat(5-n)} {['','不满意','一般','还可以','满意','很满意'][n]}</option>)}</select><textarea required value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder="环境、服务或体验都可以写下来"/><button><Send size={14}/>保存评价</button></form><p className="source-note">门店基础信息来自高德公开数据；用户评价与提交内容保存在当前设备。</p>
      </div>
    </Modal>}
    {originalImageOpen && detail && <Modal className="image-viewer-modal" onClose={() => setOriginalImageOpen(false)}>
      <img className="original-image" src={detail.images[gallery] || spaImage} alt={`${detail.name}原始图片 ${gallery + 1}`}/>
      <button className="close-button" onClick={() => setOriginalImageOpen(false)} aria-label="关闭原图"><X size={19}/></button>
      {detail.images.length > 1 && <><button className="gallery-arrow prev" aria-label="上一张原图" onClick={() => setGallery(i => (i + detail.images.length - 1) % detail.images.length)}><ChevronLeft/></button><button className="gallery-arrow next" aria-label="下一张原图" onClick={() => setGallery(i => (i + 1) % detail.images.length)}><ChevronRight/></button><span className="gallery-count">{gallery + 1} / {detail.images.length}</span></>}
    </Modal>}
    {tech && <Modal className="tech-modal" onClose={() => setTech(null)}><div className="tech-cover"><img src={tech.images[techGallery] || spaImage} alt={tech.name}/><button className="close-button" onClick={() => setTech(null)} aria-label="关闭"><X size={19}/></button>{tech.images.length > 1 && <><button className="gallery-arrow prev" aria-label="上一张技师照片" onClick={() => setTechGallery(i => (i + tech.images.length - 1) % tech.images.length)}><ChevronLeft/></button><button className="gallery-arrow next" aria-label="下一张技师照片" onClick={() => setTechGallery(i => (i + 1) % tech.images.length)}><ChevronRight/></button><span className="gallery-count">{techGallery + 1} / {tech.images.length}</span></>}</div><div className="tech-detail"><span className="detail-kicker">门店服务团队</span><h2>{tech.name}</h2><span className="tech-title">{tech.title}</span><div className="tags">{tech.specialties.map(s => <span key={s}>{s}</span>)}</div><h3>技师介绍</h3><p>{tech.bio || '暂无详细介绍'}</p><small>技师资料由门店提交并经审核后展示。</small></div></Modal>}
    {userOpen && <Modal className="user-modal" onClose={() => setUserOpen(false)}><div className="user-head"><div><span className="detail-kicker">WASHJOY</span><h2>我的</h2></div><button className="close-lite" onClick={() => setUserOpen(false)} aria-label="关闭"><X/></button></div><div className="user-tabs">{[['favorites','我的收藏'],['reviews','我的评价'],['submissions','我的提交']].map(([id, title]) => <button key={id} className={userTab === id ? 'active' : ''} onClick={() => setUserTab(id)}>{title}</button>)}</div>{userTab === 'favorites' && <div className="user-list">{userPlaceList.length ? userPlaceList.map(p => <div className="user-row" key={p.id}><div><b>{p.name}</b><small>{p.type} · {p.area} · {p.rating} 分</small></div><button onClick={() => {setUserOpen(false);openDetail(p)}}>查看门店</button></div>) : <div className="user-empty"><Heart size={22}/><span>收藏的门店会显示在这里</span></div>}</div>}{userTab === 'reviews' && <div className="user-list">{reviews.length ? reviews.map(r => <div className="user-row review-row" key={r.id}><div><b>{r.placeName} <span>{'★'.repeat(r.rating)}</span></b><small>{r.date} · {r.text}</small></div><button onClick={() => {setUserOpen(false);openDetail(placeData.find(p => p.id === r.placeId) || placeData[0])}}>查看门店</button></div>) : <div className="user-empty"><MessageSquareText size={22}/><span>你写过的评价会显示在这里</span></div>}</div>}{userTab === 'submissions' && <><div className="user-list">{submissions.length ? submissions.map(s => <div className="user-row" key={s.id}><div><b>{s.name}</b><small>{s.type} · {s.area} · {s.date}</small></div><span className="status">{s.status}</span></div>) : <div className="user-empty"><Bath size={22}/><span>提交的门店及审核状态会显示在这里</span></div>}</div><h3 className="form-title">提交新门店</h3><form className="submit-form" onSubmit={submitPlace}><input name="name" required placeholder="门店名称"/><div className="form-pair"><select name="type" defaultValue="洗浴中心">{categories.slice(1).map(c => <option key={c}>{c}</option>)}</select><input name="area" placeholder="所在区域"/></div><input name="address" placeholder="详细地址"/><textarea name="techs" placeholder={'技师资料（每行一位）\n姓名|岗位|图片地址1;图片地址2|简介|擅长项目,项目二'}/><button className="submit-button">提交审核 <ChevronRight size={15}/></button><p className="submit-note">提交后进入待审核状态。审核通过后门店及技师信息会展示在附近列表中。技师图片可填写图片链接，多个图片用分号分隔。</p></form></>}</Modal>}
    <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
  </div>
}

createRoot(document.getElementById('root')).render(<App />)
