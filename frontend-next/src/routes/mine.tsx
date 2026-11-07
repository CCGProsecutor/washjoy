import { Button, Tabs } from '@heroui/react'
import { Heart, MessageSquareText, Star, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavBar } from '../components/nav-bar'
import { TabBar } from '../components/tab-bar'
import { EmptyState, ErrorState, SkeletonRows } from '../components/ui/states'
import { api, appUrl, getPlaces, getSession, savedPlacesKey, type Place, type Review, type User } from '../lib/api'
import '../styles/account-admin.css'

type Tab = 'saved' | 'reviews'
const openPlace = (id: string) => window.location.assign(`${appUrl()}?place=${encodeURIComponent(id)}`)

export default function Mine() {
  const [user, setUser] = useState<User | null>(null)
  const [tab, setTab] = useState<Tab>('saved')
  const [savedIds, setSavedIds] = useState<string[]>([])
  const [places, setPlaces] = useState<Place[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => { if (new URLSearchParams(window.location.search).get('tab') === 'reviews') setTab('reviews') }, [])
  useEffect(() => {
    let active = true
    setLoading(true); setFailed(false)
    void getSession().then(async (session) => {
      if (!active) return
      setUser(session)
      if (!session) { setLoading(false); return }
      try {
        const ids: string[] = JSON.parse(localStorage.getItem(savedPlacesKey(session)) || '[]')
        const [allPlaces, mine] = await Promise.all([getPlaces(), api<{ reviews: Review[] }>('reviews/mine')])
        if (active) { setSavedIds(ids); setPlaces(allPlaces.filter((place) => ids.includes(place.id))); setReviews(mine.reviews || []) }
      } catch { if (active) setFailed(true) }
      finally { if (active) setLoading(false) }
    })
    return () => { active = false }
  }, [attempt])

  function unsave(place: Place) {
    if (!user) return
    const next = savedIds.filter((id) => id !== place.id)
    setSavedIds(next); setPlaces((current) => current.filter((item) => item.id !== place.id))
    localStorage.setItem(savedPlacesKey(user), JSON.stringify(next))
  }

  const signIn = <a className="wj-account-action wj-account-action-primary" href={appUrl('account/')}>登录或注册</a>
  const toMap = <a className="wj-account-action" href={appUrl()}>去附近看看</a>

  return <main className="wj-app wj-page wj-account-page">
    <NavBar title="收藏与评价" />
    <section className="wj-account-shell">
      <Tabs selectedKey={tab} onSelectionChange={(key) => setTab(key as Tab)} aria-label="收藏或评价" className="wj-account-tabs">
        <Tabs.ListContainer><Tabs.List>
          <Tabs.Tab id="saved"><Heart size={20} />收藏{user ? ` ${places.length}` : ''}</Tabs.Tab>
          <Tabs.Tab id="reviews"><MessageSquareText size={20} />评价{user ? ` ${reviews.length}` : ''}</Tabs.Tab>
        </Tabs.List></Tabs.ListContainer>
      </Tabs>
      {loading ? <SkeletonRows count={3} />
        : failed ? <ErrorState title="暂时加载不了" hint="请检查网络后重试" onRetry={() => setAttempt((count) => count + 1)} />
        : !user ? <EmptyState icon={UserRound} title="登录后查看你的收藏和评价" hint="收藏按账户保存在当前设备" actions={signIn} />
        : tab === 'saved' ? (places.length === 0
          ? <EmptyState icon={Heart} title="还没有收藏门店" hint="在门店详情里点“收藏”就会出现在这里" actions={toMap} />
          : <div className="wj-account-list">{places.map((place) => <article className="wj-saved-card" key={place.id}>
            <button className="wj-saved-open" onClick={() => openPlace(place.id)}><span className="wj-saved-mark"><Heart size={32} aria-hidden="true" />{(place.images[0] || place.image) && <img src={place.images[0] || place.image} alt="" loading="lazy" decoding="async" onError={(event) => { event.currentTarget.hidden = true }} />}</span><span><strong>{place.name}</strong><small>{place.category} · {place.address || place.area || '地址待补充'}</small></span></button>
            <Button isIconOnly aria-label={`取消收藏 ${place.name}`} className="wj-account-icon-button" onPress={() => unsave(place)}><Heart size={20} fill="currentColor" /></Button>
          </article>)}</div>)
        : (reviews.length === 0 ? <EmptyState icon={MessageSquareText} title="还没有发布评价" hint="去门店详情里分享一次体验" actions={toMap} />
          : <div className="wj-account-list">{reviews.map((review) => <article className="wj-review-card" key={review.id}>
            <a href={`${appUrl()}?place=${encodeURIComponent(review.placeId)}`}><strong>{review.placeName}</strong><time>{new Date(review.created * 1000).toLocaleDateString('zh-CN')}</time></a>
            <span className="wj-review-stars" aria-label={`${review.rating} 星`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} size={15} fill={index < review.rating ? 'currentColor' : 'none'} />)}</span>
            <p>{review.text}</p>
          </article>)}</div>)}
    </section>
    <TabBar active="saved" />
  </main>
}
