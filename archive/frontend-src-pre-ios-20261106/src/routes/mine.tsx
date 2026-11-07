import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ArrowLeft, Heart, LoaderCircle, MessageSquareText, Star, UserRound } from 'lucide-react'
import { api, getPlaces, getSession, savedPlacesKey, type Place, type Review, type User } from '../lib/api'

export const Route = createFileRoute('/mine')({ component: Mine })

function Mine() {
  const [user, setUser] = useState<User | null>(null)
  const [tab, setTab] = useState<'saved' | 'reviews'>('saved')
  const [savedIds, setSavedIds] = useState<string[]>([])
  const [places, setPlaces] = useState<Place[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    void getSession().then(async (session) => {
      if (!active) return
      setUser(session)
      if (!session) { setLoading(false); return }
      try {
        const ids: string[] = JSON.parse(localStorage.getItem(savedPlacesKey(session)) || '[]')
        const [allPlaces, myReviews] = await Promise.all([getPlaces(), api<{ reviews: Review[] }>('reviews/mine')])
        if (active) { setSavedIds(ids); setPlaces(allPlaces.filter((place) => ids.includes(place.id))); setReviews(myReviews.reviews || []) }
      } catch { if (active) setSavedIds([]) }
      finally { if (active) setLoading(false) }
    })
    return () => { active = false }
  }, [])

  function unsave(place: Place) {
    if (!user) return
    const next = savedIds.filter((id) => id !== place.id)
    setSavedIds(next); setPlaces(places.filter((item) => item.id !== place.id))
    localStorage.setItem(savedPlacesKey(user), JSON.stringify(next))
  }

  return <main className="simple-page"><header><a href="/washjoy/" aria-label="返回地图"><ArrowLeft size={17}/></a><h1>我的</h1><a href="/washjoy/account/" aria-label="账户"><UserRound size={18}/></a></header><section className="profile-block"><div className="profile-avatar">{user?.profile?.displayName?.slice(0,1) || '游'}</div><div><strong>{user?.profile?.displayName || (user ? 'Washjoy 用户' : '游客')}</strong><p>{user?.phone || '登录以同步账户状态'}</p></div>{user ? <a href="/washjoy/account/">账户</a> : <a href="/washjoy/account/">登录</a>}</section><nav className="mine-tabs"><button className={tab === 'saved' ? 'active' : ''} onClick={() => setTab('saved')}><Heart size={15}/>收藏 {user && <span>{places.length}</span>}</button><button className={tab === 'reviews' ? 'active' : ''} onClick={() => setTab('reviews')}><MessageSquareText size={15}/>评价 {user && <span>{reviews.length}</span>}</button></nav>{loading ? <div className="mine-loading"><LoaderCircle size={18}/>正在加载</div> : !user ? <div className="mine-empty"><UserRound size={24}/><p>登录后查看你的收藏和评价</p><a href="/washjoy/account/">登录或注册</a></div> : tab === 'saved' ? places.length ? <div className="mine-place-list">{places.map((place) => <article className="mine-place" key={place.id}><a href={`/washjoy/?place=${encodeURIComponent(place.id)}`}><div className="mine-place-thumb">{place.image ? <img src={place.image} alt=""/> : <MapPinFallback/>}</div><div><strong>{place.name}</strong><span>{place.category} · {place.address}</span></div></a><button aria-label={`取消收藏 ${place.name}`} onClick={() => unsave(place)}><Heart size={17} fill="currentColor"/></button></article>)}</div> : <div className="mine-empty"><Heart size={24}/><p>还没有收藏门店</p><a href="/washjoy/">去附近看看</a></div> : reviews.length ? <div className="mine-review-list">{reviews.map((review) => <article className="mine-review" key={review.id}><a href={`/washjoy/?place=${encodeURIComponent(review.placeId)}`}>{review.placeName}</a><div>{Array.from({length:5},(_,index)=><Star key={index} size={13} fill={index < review.rating ? 'currentColor' : 'none'}/>)}</div><p>{review.text}</p><time>{new Date(review.created*1000).toLocaleDateString('zh-CN')}</time></article>)}</div> : <div className="mine-empty"><MessageSquareText size={24}/><p>还没有发布评价</p><a href="/washjoy/">去附近看看</a></div>}</main>
}

function MapPinFallback() { return <span className="mine-thumb-fallback">Washjoy</span> }
