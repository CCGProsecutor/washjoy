import { Star } from 'lucide-react'
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { api, appUrl, type Place, type Review } from '../lib/api'
import { Button } from './ui/button'
import { Icon } from './ui/icon'

export type ReviewsHandle = { focusForm: () => void }

export const PlaceReviews = forwardRef<ReviewsHandle, { place: Place; signedIn: boolean }>(function PlaceReviews({ place }, ref) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [text, setText] = useState('')
  const [rating, setRating] = useState(5)
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [request, setRequest] = useState(0)
  const [busy, setBusy] = useState(false)
  const field = useRef<HTMLTextAreaElement>(null)
  const query = `reviews?placeId=${encodeURIComponent(place.id)}&city=${encodeURIComponent(place.city)}`
  const login = `${appUrl('account/')}?returnPlace=${encodeURIComponent(place.id)}`

  useImperativeHandle(ref, () => ({ focusForm: () => { field.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }); field.current?.focus({ preventScroll: true }) } }), [])

  useEffect(() => {
    let cancelled = false
    setReviews([]); setText(''); setError(''); setLoadError('')
    api<{ reviews: Review[] }>(query)
      .then((result) => { if (!cancelled) setReviews(result.reviews || []) })
      .catch(() => { if (!cancelled) setLoadError('评价暂时无法加载') })
    return () => { cancelled = true }
  }, [query, request])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!text.trim()) return
    setBusy(true); setError('')
    try {
      await api('reviews', { method: 'POST', body: JSON.stringify({ place_id: place.id, city: place.city, rating, text: text.trim() }) })
      setText('')
      setReviews((await api<{ reviews: Review[] }>(query)).reviews || [])
    } catch (cause) {
      if (cause instanceof Error && /登录状态|未登录|401/.test(cause.message)) window.location.assign(login)
      else setError(cause instanceof Error ? cause.message : '评价提交失败，请重试')
    } finally { setBusy(false) }
  }

  return (
    <section className="wj-reviews" aria-labelledby="wj-reviews-title">
      <h3 id="wj-reviews-title" className="wj-headline">用户评价 <span className="wj-count">{reviews.length}</span></h3>
      {loadError && <p className="wj-detail-notice wj-footnote" role="status">{loadError} <button type="button" onClick={() => setRequest((current) => current + 1)}>重试</button></p>}
      <form className="wj-review-form" onSubmit={submit}>
        <div className="wj-stars" role="group" aria-label="评分">
          {[1, 2, 3, 4, 5].map((score) => <button key={score} type="button" className={score <= rating ? 'is-on' : ''} aria-label={`${score} 星`} aria-pressed={rating === score} onClick={() => setRating(score)}><Icon icon={Star} size="md" fill={score <= rating} /></button>)}
        </div>
        <textarea ref={field} value={text} onChange={(event) => setText(event.target.value)} maxLength={500} rows={3} placeholder="分享这次体验" aria-label="评价内容" aria-invalid={Boolean(error)} aria-describedby={error ? 'wj-review-error' : undefined} />
        <div className="wj-review-actions">
          {error && <span id="wj-review-error" className="wj-footnote wj-danger" role="alert">{error}</span>}
          <Button type="submit" variant="primary" loading={busy} disabled={!text.trim()}>发布评价</Button>
        </div>
      </form>
      {reviews.map((review) => (
        <article className="wj-review" key={review.id}>
          <header><strong className="wj-subhead">{review.author || '用户'}</strong><span className="wj-rating wj-footnote"><Icon icon={Star} size="md" fill />{review.rating}</span><time className="wj-footnote wj-secondary">{new Date(review.created * 1000).toLocaleDateString('zh-CN')}</time></header>
          <p className="wj-subhead">{review.text}</p>
        </article>
      ))}
    </section>
  )
})
