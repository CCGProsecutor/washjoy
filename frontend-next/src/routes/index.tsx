import { List, Map, MapPin } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { HomeSheet, type TravelMode } from '../components/home-sheet'
import { MapView } from '../components/map-view'
import { PlaceDetail } from '../components/place-detail'
import { TabBar } from '../components/tab-bar'
import { Button } from '../components/ui/button'
import { appUrl, getSession, savedPlacesKey, type Place, type User } from '../lib/api'
import { distanceInKm } from '../lib/geo'
import { PAGE_SIZE, useNearby } from '../lib/use-nearby'

export default function Home() {
  const [shell, setShell] = useState<HTMLElement | null>(null)
  const [selected, setSelected] = useState<Place | null>(null)
  const [travelMode, setTravelMode] = useState<TravelMode>('transit')
  const nearby = useNearby(travelMode)
  const [mapError, setMapError] = useState(false)
  const [mapMode, setMapMode] = useState(false)
  const [mapCreated, setMapCreated] = useState(false)
  const scrollPosition = useRef(0)
  const switchView = () => {
    const next = !mapMode
    if (next) { scrollPosition.current = window.scrollY; setMapCreated(true) }
    setMapError(false); setMapMode(next)
    requestAnimationFrame(() => window.scrollTo({ top: next ? 0 : scrollPosition.current, behavior: 'instant' }))
  }
  const [session, setSession] = useState<User | null>(null)
  const [saved, setSaved] = useState<string[]>([])
  const { userLocation, dataset, visible, allPlaces } = nearby

  useEffect(() => { void getSession().then(setSession) }, [])
  useEffect(() => { try { setSaved(JSON.parse(localStorage.getItem(savedPlacesKey(session)) || '[]')) } catch { setSaved([]) } }, [session])

  // 深链接：收藏页、登录页回跳时带 ?place=ID，数据到达后打开对应门店。
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('place')
    if (!id || allPlaces.length === 0) return
    const match = allPlaces.find((place) => place.id === id)
    if (match) setSelected(match)
    const url = new URL(window.location.href); url.searchParams.delete('place'); window.history.replaceState(null, '', url)
  }, [allPlaces])

  const toggleSaved = useCallback((place: Place) => {
    if (!session) { window.location.assign(`${appUrl('account/')}?returnPlace=${encodeURIComponent(place.id)}`); return }
    const next = saved.includes(place.id) ? saved.filter((id) => id !== place.id) : [...saved, place.id]
    setSaved(next)
    localStorage.setItem(savedPlacesKey(session), JSON.stringify(next))
  }, [saved, session])

  const mapPlaces = useMemo(() => visible.map(({ place }) => place), [visible])
  const distance = selected && userLocation && selected.latitude && selected.longitude ? distanceInKm(userLocation.latitude, userLocation.longitude, selected.latitude, selected.longitude) : null

  return (
    <main className={`wj-app wj-home wj-directory${mapMode ? ' is-map' : ''}`} ref={setShell}>
      <HomeSheet nearby={nearby} travelMode={travelMode} onTravelMode={setTravelMode} onOpen={setSelected} saved={saved} onToggleSaved={toggleSaved} mapMode={mapMode} />
      {mapCreated && <section className="wj-directory-map" aria-label="门店地图" hidden={!mapMode} inert={!mapMode}>
        <MapView places={mapPlaces} selectedId={selected?.id ?? null} user={userLocation} radiusKm={nearby.radiusKm} center={dataset.center} onSelect={setSelected} onError={() => setMapError(true)} />
        {mapError && <p className="wj-directory-map-error" role="status">地图服务暂不可用，门店列表仍可浏览</p>}
        <div className="wj-directory-map-preview">
          <span role="status">{nearby.isPending ? '正在查找附近门店…' : `已显示 ${visible.length} / ${nearby.results.length} 家 · ${dataset.name}`}</span>
          {visible[0] && <button type="button" aria-label={`地图预览${visible[0].place.name}`} onClick={() => setSelected(visible[0].place)}><MapPin size={18} /><span>{visible[0].place.name}</span><span>查看详情</span></button>}
          {nearby.routeHasMore && <Button variant="plain" className="wj-map-more" isDisabled={nearby.durationPending} onPress={nearby.routeLoadMore}>继续查找可达门店</Button>}
          {nearby.results.length > visible.length && <Button variant="plain" className="wj-map-more" aria-label="加载更多地图门店" onPress={() => nearby.setLimit(value => value + PAGE_SIZE)}>再显示 {Math.min(PAGE_SIZE, nearby.results.length - visible.length)} 家</Button>}
        </div>
      </section>}
      <div className="wj-view-toggle-dock"><Button variant="glass" className="wj-view-toggle" aria-label={mapMode ? '查看列表' : '查看地图'} aria-pressed={mapMode} onPress={switchView}>{mapMode ? <List size={18} /> : <Map size={18} />}{mapMode ? '查看列表' : '查看地图'}</Button></div>
      {shell && <PlaceDetail place={selected} onClose={() => setSelected(null)} container={shell} datasetName={dataset.name} distance={distance} user={userLocation} travelMode={travelMode} signedIn={Boolean(session)} saved={Boolean(selected && saved.includes(selected.id))} onToggleSaved={toggleSaved} />}
      <TabBar active="nearby" />
    </main>
  )
}
