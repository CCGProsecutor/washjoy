import { Button, Modal } from '@heroui/react'
import { ChevronDown, Clock, LocateFixed, MapPin, MapPinOff, Search, Star, X } from 'lucide-react'
import { useState } from 'react'
import { placeCategories, type Place } from '../lib/api'
import { PAGE_SIZE, radiusLabel, radiusSteps, durationSteps, type useNearby } from '../lib/use-nearby'
import { PlaceCard } from './place-card'
import { EmptyState, ErrorState } from './ui/states'

import { TravelIcon } from './travel-icon'
import type { TravelMode } from '../lib/travel-mode'
export type { TravelMode } from '../lib/travel-mode'
const modes = [{ value: 'transit', label: '公交地铁' }, { value: 'bike', label: '骑行' }, { value: 'car', label: '驾车' }] as const
const categories = ['全部', placeCategories[0], placeCategories[2], placeCategories[1], placeCategories[3], placeCategories[4]]
const categoryLabels: Record<string, string> = { '洗浴中心': '洗浴', '足疗会所': '足疗', '大众澡堂': '澡堂', '街边店': '街边' }

export function HomeSheet({ nearby, travelMode, onTravelMode, onOpen, saved, onToggleSaved, mapMode }: {
  nearby: ReturnType<typeof useNearby>; travelMode: TravelMode; onTravelMode: (mode: TravelMode) => void;
  onOpen: (place: Place) => void; saved: string[]; onToggleSaved: (place: Place) => void; mapMode: boolean;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const { results, visible, isPending, isError, refetch, userLocation, radiusKm, durationIndex, setDurationIndex } = nearby
  const canWiden = Boolean(userLocation) && radiusKm !== 0
  const clearFilters = () => { nearby.setQuery(''); nearby.setCategory('全部'); nearby.setRecommended(false); setDurationIndex(1); nearby.setRadiusIndex(3) }
  const city = nearby.fix?.city || nearby.dataset.name
  const durationText = durationIndex < 0 ? '时间不限' : `${durationSteps[durationIndex] / 60}分钟`

  return <div className="wj-directory-shell">
    <header className="wj-directory-header">
      <div className="wj-directory-top"><a className="wj-wordmark" href="/washjoy/" aria-label="Washjoy 首页">Washjoy</a><Button variant="ghost" className="wj-directory-city" aria-label="定位到当前位置" isDisabled={nearby.locating} aria-busy={nearby.locating} onPress={nearby.locateUser}><MapPin size={17} fill="currentColor" /><span>{city.replace(/市$/, '')}</span><LocateFixed size={15} /></Button></div>
      <div className="wj-directory-search-row">
        <div className={`wj-directory-search${nearby.query ? ' has-query' : ''}`}><Search size={20} aria-hidden="true" /><input type="search" aria-label="搜索门店" placeholder="搜索门店" value={nearby.query} onChange={event => nearby.setQuery(event.target.value)} enterKeyHint="search" autoComplete="off" />{nearby.query && <Button isIconOnly variant="ghost" className="wj-search-clear" aria-label="清除搜索" onPress={() => nearby.setQuery('')}><X size={17} /></Button>}<Button variant="ghost" className="wj-directory-time" aria-label="可达时间筛选" onPress={() => setFiltersOpen(true)}><Clock size={16} aria-hidden="true" /><span>{durationText}</span><ChevronDown size={12} aria-hidden="true" /></Button></div>
        <Button variant="ghost" className={`wj-directory-recommend${nearby.recommended ? ' is-active' : ''}`} aria-label="推荐" aria-pressed={nearby.recommended} onPress={() => nearby.setRecommended(!nearby.recommended)}><Star size={18} aria-hidden="true" fill={nearby.recommended ? 'currentColor' : 'none'} />推荐</Button>
      </div>
      <div className="wj-directory-categories" role="group" aria-label="门店类型">{categories.map(category => <Button key={category} variant="ghost" aria-label={category} className={category === nearby.category ? 'is-active' : ''} aria-pressed={category === nearby.category} onPress={() => nearby.setCategory(category)}>{categoryLabels[category] || category}</Button>)}</div>
      {(nearby.locating || nearby.locationState === 'failed' || nearby.durationPending || nearby.outsideCoverage || (!nearby.userLocation && nearby.locationState === 'ready')) && <p className="wj-directory-status" role="status">{!nearby.reachabilityAvailable && !nearby.locating ? `${nearby.status} · 当前按全城浏览，定位后验证可达时间` : nearby.status}</p>}
    </header>
    {!mapMode && <section className="wj-directory-results" aria-label="附近门店">
      <div className="wj-directory-heading"><h1>附近，放松一下</h1><p>{nearby.recommended ? '站长推荐的好去处' : '探索附近的汤泉、足疗与私汤'}{!isPending && !isError && <span> · {results.length} 家</span>}</p></div>
      {isError ? <ErrorState title="暂时连接不上门店服务" hint="请检查网络后重试" onRetry={() => void refetch()} /> : isPending ? <div className="wj-directory-grid" aria-label="正在加载门店" aria-busy="true">{[0, 1, 2].map(index => <div key={index} className="wj-venue-skeleton"><div /><i /><i /></div>)}</div> : nearby.durationPending && results.length === 0 ? <div className="wj-directory-wait" role="status"><Clock size={24} /><p>{!nearby.reachabilityAvailable && !nearby.locating ? `${nearby.status} · 当前按全城浏览，定位后验证可达时间` : nearby.status}</p><span>路线服务响应后会显示符合时间的门店</span></div> : results.length === 0 ? <EmptyState icon={MapPinOff} title={canWiden ? `${radiusLabel(radiusKm)}内没有匹配的门店` : nearby.routeHasMore ? '这批门店暂无符合时长的结果' : '没有匹配的门店'} hint={nearby.routeHasMore ? '可继续查找更多门店，或调整可达时间' : '换个关键词，或清除筛选再试'} actions={<>{canWiden && <Button variant="secondary" onPress={() => nearby.setRadiusIndex(Math.min(nearby.radiusIndex + 1, radiusSteps.length - 1))}>扩大范围</Button>}<Button variant="secondary" onPress={clearFilters}>清除筛选</Button></>} /> : <>
        <div className="wj-directory-grid">{visible.map(({ place, distance }, index) => <PlaceCard key={place.id} place={place} distance={distance} saved={saved.includes(place.id)} onOpen={onOpen} onToggleSaved={onToggleSaved} priority={index === 0} />)}</div>
        {results.length > visible.length ? <Button variant="ghost" className="wj-directory-more" onPress={() => nearby.setLimit(nearby.limit + PAGE_SIZE)}>再看 {Math.min(PAGE_SIZE, results.length - visible.length)} 家<ChevronDown size={16} /></Button> : visible.length > 0 && <p className="wj-directory-end">当前已找到的好去处</p>}
      </>}
      {!isPending && !isError && durationIndex >= 0 && nearby.reachabilityAvailable && <div className="wj-route-progress"><p role="status">{nearby.durationPending ? `正在核算本批候选 · ` : '已核算候选 · '}{nearby.routeComputedCount} / {nearby.routeBatchCandidateCount} 家 · 符合${durationText} {results.length} 家{nearby.routeRemainingCount > 0 ? ` · 还有 ${nearby.routeRemainingCount} 家待查` : ''}</p>{nearby.routeHasMore && <Button variant="ghost" className="wj-directory-more" isDisabled={nearby.durationPending} onPress={nearby.routeLoadMore}>继续查找可达门店<ChevronDown size={16} /></Button>}</div>}
    </section>}
    <Modal isOpen={filtersOpen} onOpenChange={setFiltersOpen}>
      <Modal.Backdrop className="wj-filter-backdrop"><Modal.Container className="wj-filter-container"><Modal.Dialog className="wj-filter-dialog">
        <Modal.Header className="wj-filter-header"><Modal.Heading>筛选附近门店</Modal.Heading><Modal.CloseTrigger className="wj-filter-close" aria-label="关闭筛选"><X size={20} /></Modal.CloseTrigger></Modal.Header>
        <Modal.Body className="wj-filter-body">
          <div className="wj-filter-field"><span>出行方式</span><div className="wj-filter-modes" role="group" aria-label="出行方式">{modes.map(({ value, label }) => <Button key={value} variant="ghost" aria-pressed={travelMode === value} onPress={() => onTravelMode(value)}><TravelIcon mode={value} selected={travelMode === value} />{label}</Button>)}</div><small>按所选方式计算可达时间，并打开对应路线。</small></div>
          <label className="wj-filter-field"><span>搜索范围</span><select aria-label="搜索范围" value={userLocation ? nearby.radiusIndex : 3} disabled={!userLocation} onChange={event => nearby.setRadiusIndex(Number(event.target.value))}>{radiusSteps.map((radius, index) => <option value={index} key={radius}>{radiusLabel(radius)}</option>)}</select></label>
          <label className="wj-filter-field"><span>可达时间</span><select aria-label="可达时间" value={nearby.durationIndex} disabled={!userLocation} onChange={event => setDurationIndex(Number(event.target.value))}><option value={-1}>无限制</option>{durationSteps.map((seconds, index) => <option value={index} key={seconds}>{seconds / 60} 分钟</option>)}</select><small>仅显示已有路线估时且符合时间的门店；切换方式自动使用对应缓存。</small></label>
          {!userLocation && <div className="wj-filter-location"><p>{nearby.status}。获取精确位置后可筛选距离与可达时间。</p><Button variant="secondary" isDisabled={nearby.locating} onPress={nearby.locateUser}>重新定位</Button></div>}
        </Modal.Body>
        <Modal.Footer className="wj-filter-footer"><Button variant="ghost" onPress={clearFilters}>清除筛选</Button><Button variant="primary" aria-label="完成筛选" onPress={() => setFiltersOpen(false)}>查看 {results.length} 家门店</Button></Modal.Footer>
      </Modal.Dialog></Modal.Container></Modal.Backdrop>
    </Modal>
  </div>
}
