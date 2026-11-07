import { Button, Input } from '@heroui/react'
import { Check, Heart, LoaderCircle, LogOut, MessageSquareText, Settings } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavBar } from '../components/nav-bar'
import { TabBar } from '../components/tab-bar'
import { api, appUrl, getSession, type User } from '../lib/api'
import '../styles/account-admin.css'

type Mode = 'login' | 'register'

export default function Account() {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [mode, setMode] = useState<Mode>('login')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<'error' | 'success'>()
  const [feedbackCycle, setFeedbackCycle] = useState(0)
  const [returnPlace, setReturnPlace] = useState('')

  useEffect(() => {
    setReturnPlace(new URLSearchParams(window.location.search).get('returnPlace') || '')
    void getSession().then((session) => { setUser(session); setReady(true) })
  }, [])

  async function authenticate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return; setBusy(true); setError(''); setFeedback(undefined)
    try {
      const endpoint = mode === 'login' ? 'auth/login' : 'auth/register'
      const body = mode === 'login' ? { phone, password } : { phone, password, displayName }
      const result = await api<{ user: User }>(endpoint, { method: 'POST', body: JSON.stringify(body) })
      setUser(result.user); setFeedback('success')
      if (returnPlace) window.location.assign(`${appUrl()}?place=${encodeURIComponent(returnPlace)}`)
    } catch (cause) { setError(cause instanceof Error ? cause.message : '网络暂时不可用'); setFeedbackCycle(value => value + 1); setFeedback('error') }
    finally { setBusy(false) }
  }
  async function logout() {
    setBusy(true); setError('')
    try { await api('auth/logout', { method: 'POST' }); setUser(null); setPassword('') }
    catch (cause) { setError(cause instanceof Error ? cause.message : '退出失败') }
    finally { setBusy(false) }
  }

  const title = user ? '我的账户' : mode === 'login' ? '欢迎回来' : '创建账户'
  const name = user?.profile?.displayName || 'Washjoy 用户'
  return <main className="wj-app wj-page wj-account-page">
    <NavBar title={title} />
    <section className="wj-account-shell">
      {!ready ? <p className="wj-account-status" role="status">正在恢复登录状态…</p> : user ? <>
        <section className="wj-profile-card" data-motion-feedback={feedback === 'success' ? 'success' : undefined}><span className="wj-profile-avatar" aria-hidden="true">{name.slice(0, 1)}</span><div><p>{feedback === 'success' && <Check size={16} aria-hidden="true" />}已登录</p><h2>{name}</h2><span>{user.phone}</span></div></section>
        <nav className="wj-account-menu" aria-label="账户功能">
          <a href={appUrl('mine/')}><Heart size={20} /><span>我的收藏</span></a>
          <a href={`${appUrl('mine/')}?tab=reviews`}><MessageSquareText size={20} /><span>我的评价</span></a>
          {user.role === 'admin' && <a href={appUrl('admin/')}><Settings size={20} /><span>门店管理</span></a>}
        </nav>
        <Button className="wj-account-logout" isDisabled={busy} onPress={() => void logout()}><LogOut size={20} />{busy ? '正在退出…' : '退出登录'}</Button>
        {error && <p key={feedbackCycle} className="wj-account-alert" role="alert">{error}</p>}
      </> : <form className="wj-auth-form" onSubmit={authenticate} data-motion-feedback={feedback} onInputCapture={() => { if (feedback) setFeedback(undefined) }} onInvalidCapture={() => setFeedback('error')}>
        <p className="wj-auth-intro">{mode === 'login' ? '登录后管理收藏与评价' : '注册后即可收藏门店并发布评价'}</p>
        <div role="group" aria-label="登录或注册" className="wj-account-tabs">
          <button type="button" className={`wj-mode-tab${mode === 'login' ? ' is-active' : ''}`} aria-pressed={mode === 'login'} onClick={() => { setMode('login'); setError(''); setFeedback(undefined) }}>登录</button>
          <button type="button" className={`wj-mode-tab${mode === 'register' ? ' is-active' : ''}`} aria-pressed={mode === 'register'} onClick={() => { setMode('register'); setError(''); setFeedback(undefined) }}>注册</button>
        </div>
        {mode === 'register' && <label className="wj-auth-field"><span>昵称</span><Input autoComplete="nickname" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={40} required placeholder="最多 40 个字符" /></label>}
        <label className="wj-auth-field"><span>手机号</span><Input autoComplete="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} minLength={11} maxLength={11} pattern="1[3-9][0-9]{9}" required placeholder="请输入手机号" /></label>
        <label className="wj-auth-field"><span>密码</span><Input autoComplete={mode === 'login' ? 'current-password' : 'new-password'} type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={10} maxLength={128} required placeholder={mode === 'register' ? '10–128 个字符' : '请输入密码'} /></label>
        {error && <p key={feedbackCycle} className="wj-account-alert" role="alert">{error}</p>}
        <Button type="submit" isDisabled={busy} aria-busy={busy || undefined} className="wj-auth-submit">{busy && <LoaderCircle className="wj-spin" size={18} aria-hidden="true" />}{busy ? '正在处理…' : mode === 'login' ? '登录' : '注册并登录'}</Button>
        <p className="wj-auth-note">收藏按账户保存在当前设备，登录后可发布评价</p>
      </form>}
    </section>
    <TabBar active="me" />
  </main>
}
