import { Button, Input, Modal, Tabs } from '@heroui/react'
import { Bath, ChevronRight, CloudSun, Heart, LocateFixed, Map, MapPin, Moon, Navigation, Search, SlidersHorizontal, Sparkles, Star, UserRound, X } from 'lucide-react'
import { useState } from 'react'
import '../styles/playground.css'

type State = 'nearby' | 'loading' | 'empty' | 'error'
type Theme = 'light' | 'dark'
type Nav = 'nearby' | 'saved' | 'account'

const places = [
  { name: '汤山云栖温泉', type: '私汤温泉', distance: '2.4 km', time: '18 分钟', rating: '4.8', price: '¥168 起', tone: 'sunset' },
  { name: '水木年华洗浴中心', type: '洗浴中心', distance: '3.1 km', time: '23 分钟', rating: '4.7', price: '¥89 起', tone: 'forest' },
  { name: '栖霞山下足疗', type: '足疗会所', distance: '4.6 km', time: '28 分钟', rating: '4.6', price: '¥128 起', tone: 'river' },
]

function DemoMap({ selected, onSelect }: { selected: number | null; onSelect: (index: number) => void }) {
  return <div className="wj-play-map" aria-label="门店位置示意图">
    <svg viewBox="0 0 900 760" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="900" height="760" fill="currentColor" />
      <path className="wj-play-water" d="M-10 645C130 550 170 710 325 602S530 670 650 552s176-85 280-160v420H-10Z" />
      <path className="wj-play-park" d="M-20 20c150 50 167 159 310 108s150 30 243 5 163-130 386-65v169C735 315 662 273 530 335S294 300 183 370 50 336-20 403Z" />
      <path className="wj-play-road-main" d="M-40 493C162 350 255 478 406 332S655 389 937 147" />
      <path className="wj-play-road-main" d="M226-40c88 155 214 189 250 370s142 247 435 363" />
      <path className="wj-play-road" d="M-40 282c175-2 206 146 391 66s180-110 311-48 158 9 279-113M45 715c125-115 238-123 325-43s242 32 461-138" />
      <path className="wj-play-road" d="M90 20c15 197 142 247 296 191s207 85 278 117 151 11 227-40" />
    </svg>
    <div className="wj-play-map-label wj-play-label-a">玄武湖</div>
    <div className="wj-play-map-label wj-play-label-b">紫金山</div>
    {places.map((place, index) => <button key={place.name} type="button" className={`wj-play-marker marker-${index}${selected === index ? ' is-selected' : ''}`} onClick={() => onSelect(index)} aria-label={`查看${place.name}`}><Bath size={16} /></button>)}
    <div className="wj-play-user-dot" aria-label="演示位置" />
    <p className="wj-play-map-notice">演示地图，仅展示布局</p>
  </div>
}

function PlaceList({ state, entries, onOpen }: { state: State; entries: typeof places; onOpen: (index: number) => void }) {
  if (state === 'loading') return <div className="wj-play-list" aria-live="polite">{[0, 1, 2].map((item) => <div className="wj-play-skeleton" key={item}><span /><div><i /><i /><i /></div></div>)}</div>
  if (state === 'empty' || entries.length === 0) return <div className="wj-play-state"><MapPin size={26} /><strong>这一带还没有匹配的门店</strong><span>换个分类，或扩大搜索范围</span></div>
  if (state === 'error') return <div className="wj-play-state"><CloudSun size={26} /><strong>暂时没能获取门店</strong><span>网络恢复后可以重新加载</span></div>
  return <div className="wj-play-list">{entries.map((place) => { const index = places.indexOf(place); return <button className="wj-play-place" key={place.name} type="button" onClick={() => onOpen(index)}>
    <span className={`wj-play-thumb ${place.tone}`}><Bath size={19} /></span>
    <span className="wj-play-place-copy"><span className="wj-play-place-top"><span>{place.type}</span><span><Star size={13} fill="currentColor" />{place.rating}</span></span><strong>{place.name}</strong><span className="wj-play-place-meta">{place.distance} · {place.time} · {place.price}</span></span><ChevronRight size={18} /></button> })}</div>
}

export default function UiPlayground() {
  const [theme, setTheme] = useState<Theme>('light')
  const [state, setState] = useState<State>('nearby')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<number | null>(null)
  const [range, setRange] = useState('5 km')
  const [recommended, setRecommended] = useState(true)
  const [category, setCategory] = useState('全部')
  const [saved, setSaved] = useState<string[]>([])
  const [notice, setNotice] = useState('')
  const [activeNav, setActiveNav] = useState<Nav>('nearby')
  const selectedPlace = selected === null ? null : places[selected]
  const visiblePlaces = places.filter((place) => {
    const queryMatch = `${place.name}${place.type}`.includes(query.trim())
    const categoryMatch = category === '全部' || place.type.includes(category.replace('私汤温泉', '私汤').replace('足疗会所', '足疗'))
    const radiusMatch = range === '全城' || Number.parseFloat(place.distance) <= Number.parseFloat(range)
    return queryMatch && categoryMatch && radiusMatch && (!recommended || place.rating >= '4.7')
  })

  function resetDemo() { setQuery(''); setCategory('全部'); setRecommended(true); setRange('5 km'); setState('nearby'); setActiveNav('nearby') }

  return <main className={`wj-playground wj-play-${theme}`}>
    <section className="wj-play-frame" aria-labelledby="playground-title">
      <header className="wj-play-topbar">
        <div className="wj-play-identity"><span className="wj-play-logo"><Bath size={18} /></span><span><strong id="playground-title">Washjoy</strong><small>演示样板</small></span></div>
        <div className="wj-play-controls">
          <Tabs selectedKey={state} onSelectionChange={(key) => setState(key as State)} className="wj-play-state-tabs" aria-label="演示状态"><Tabs.ListContainer><Tabs.List><Tabs.Tab id="nearby">推荐</Tabs.Tab><Tabs.Tab id="loading">加载</Tabs.Tab><Tabs.Tab id="empty">空态</Tabs.Tab><Tabs.Tab id="error">错误</Tabs.Tab></Tabs.List></Tabs.ListContainer></Tabs>
          <Button isIconOnly aria-label={theme === 'light' ? '切换深色模式' : '切换浅色模式'} className="wj-play-icon-button" onPress={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon size={18} /> : <CloudSun size={18} />}</Button>
        </div>
      </header>

      {notice && <div className="wj-play-notice" role="status">{notice}<Button isIconOnly aria-label="关闭提示" onPress={() => setNotice('')}><X size={16} /></Button></div>}
      <div className="wj-play-discovery">
        <DemoMap selected={selected} onSelect={setSelected} />
        <aside className="wj-play-panel" aria-label="附近推荐">
          <div className="wj-play-panel-head">
            <div className="wj-play-location"><span><MapPin size={16} />南京 · 玄武区</span><small>已使用演示位置</small></div>
            <Button isIconOnly aria-label="定位到当前位置" className="wj-play-locate" onPress={() => setNotice('演示位置已居中：南京 · 玄武区')}><LocateFixed size={18} /></Button>
          </div>
          <label className="wj-play-search"><Search size={18} /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜店名、区域或体验" aria-label="搜索门店" /></label>
          <div className="wj-play-filter-row"><div className="wj-play-chips" aria-label="门店类型">{['全部', '洗浴中心', '私汤温泉', '足疗会所'].map((item) => <Button key={item} className={category === item ? 'is-active' : ''} onPress={() => setCategory(item)}>{item}</Button>)}</div><Button isIconOnly aria-label="重置演示筛选" className="wj-play-filter" onPress={resetDemo}><SlidersHorizontal size={17} /></Button></div>
          <div className="wj-play-summary"><div><p>附近可达</p><h1>发现你的放松时刻 <span>· {range}</span></h1></div><Button className={recommended ? 'wj-play-recommend is-active' : 'wj-play-recommend'} onPress={() => setRecommended(!recommended)}><Sparkles size={15} />站长推荐</Button></div>
          <div className="wj-play-travel" aria-label="搜索范围">{['3 km', '5 km', '全城'].map((label) => <Button key={label} className={range === label ? 'is-active' : ''} onPress={() => setRange(label)}>{label}</Button>)}</div>
          {activeNav === 'nearby' ? <PlaceList state={state} entries={visiblePlaces} onOpen={setSelected} /> : <div className="wj-play-state"><UserRound size={26} /><strong>{activeNav === 'saved' ? '演示收藏夹' : '演示账户中心'}</strong><span>{activeNav === 'saved' ? `已收藏 ${saved.length} 家演示门店` : '真实账户信息会在业务数据接入后显示'}</span><Button className="wj-play-primary" onPress={() => setActiveNav('nearby')}>回到附近</Button></div>}
          {state === 'error' && activeNav === 'nearby' && <Button className="wj-play-retry wj-play-primary" onPress={() => setState('nearby')}>重新加载演示数据</Button>}
          {state === 'empty' && activeNav === 'nearby' && <Button className="wj-play-retry wj-play-primary" onPress={resetDemo}>清除演示筛选</Button>}
          <nav className="wj-play-nav" aria-label="演示主导航">{[{ id: 'nearby' as const, label: '附近', icon: Map }, { id: 'saved' as const, label: '收藏', icon: Heart }, { id: 'account' as const, label: '我的', icon: UserRound }].map(({ id, label, icon: Icon }) => <Button key={id} isIconOnly={false} className={activeNav === id ? 'is-active' : ''} aria-current={activeNav === id ? 'page' : undefined} onPress={() => setActiveNav(id)}><Icon size={20} /><span>{label}</span></Button>)}</nav>
        </aside>
      </div>
    </section>

    <Modal>
      <Modal.Backdrop isOpen={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null) }} className={`wj-play-modal-backdrop wj-play-${theme}`}>
        <Modal.Container placement="bottom" className="wj-play-modal-container"><Modal.Dialog className="wj-play-modal">
          <Modal.Header className="wj-play-modal-header"><div><Modal.Heading className="wj-play-modal-heading">{selectedPlace?.name}</Modal.Heading><p>{selectedPlace?.type} · {selectedPlace?.distance} · {selectedPlace?.time}</p></div><Modal.CloseTrigger aria-label="关闭详情" className="wj-play-close"><X size={18} /></Modal.CloseTrigger></Modal.Header>
          <Modal.Body className="wj-play-modal-body"><div className={`wj-play-modal-image ${selectedPlace?.tone}`}><Bath size={32} /><span>门店图片将在真实数据接入后显示</span></div><div className="wj-play-modal-rating"><Star size={17} fill="currentColor" />{selectedPlace?.rating} <span>演示评分</span></div><p className="wj-play-modal-copy">这里展示详情页的内容层级、操作区与键盘可关闭的 HeroUI 弹窗行为。</p></Modal.Body>
          <Modal.Footer className="wj-play-modal-footer"><Button className="wj-play-secondary" onPress={() => { if (selectedPlace) setSaved(items => items.includes(selectedPlace.name) ? items.filter(x => x !== selectedPlace.name) : [...items, selectedPlace.name]) }}><Heart size={17} />{selectedPlace && saved.includes(selectedPlace.name) ? '已收藏' : '收藏'}</Button><Button className="wj-play-primary" onPress={() => { setSelected(null); setNotice('路线为演示占位，正式版将使用现有地图导航') }}><Navigation size={17} />查看路线</Button></Modal.Footer>
        </Modal.Dialog></Modal.Container>
      </Modal.Backdrop>
    </Modal>
  </main>
}
