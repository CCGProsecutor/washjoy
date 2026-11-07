import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ArrowLeft, LoaderCircle, LockKeyhole, LogOut, Phone, UserRound } from 'lucide-react'
import { api, appUrl, getSession, type User } from '../lib/api'

export const Route = createFileRoute('/account')({ component: Account })

function Account() {
  const [user, setUser] = useState<User | null>(null)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [returnPlace, setReturnPlace] = useState('')

  useEffect(() => {
    setReturnPlace(new URLSearchParams(window.location.search).get('returnPlace') || '')
    void getSession().then(setUser)
  }, [])

  async function authenticate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const endpoint = mode === 'login' ? 'auth/login' : 'auth/register'
      const body = mode === 'login' ? { phone, password } : { phone, password, displayName }
      const result = await api<{ user: User }>(endpoint, { method: 'POST', body: JSON.stringify(body) })
      setUser(result.user)
      if (returnPlace) window.location.assign(`${appUrl()}?place=${encodeURIComponent(returnPlace)}`)
    } catch (cause) { setError(cause instanceof Error ? cause.message : '网络暂时不可用') }
    finally { setBusy(false) }
  }

  async function logout() {
    setBusy(true)
    try { await api('auth/logout', { method: 'POST' }); setUser(null); setPassword('') }
    catch (cause) { setError(cause instanceof Error ? cause.message : '退出失败') }
    finally { setBusy(false) }
  }

  return <main className="account-page"><a className="back-link" href="/washjoy/"><ArrowLeft size={17}/>返回地图</a><section className="account-card"><div className="account-brand">Washjoy</div>{user ? <><h1>账户信息</h1><p>登录状态已恢复</p><div className="account-user"><UserRound size={20}/><div><strong>{user.profile?.displayName || 'Washjoy 用户'}</strong><span>{user.phone}</span></div>{user.role === 'admin' && <a href="/washjoy/admin/">管理</a>}</div><button className="logout-button" disabled={busy} onClick={() => void logout()}>{busy ? <LoaderCircle size={16}/> : <LogOut size={16}/>}退出登录</button>{error && <p className="form-error" role="alert">{error}</p>}</> : <><h1>{mode === 'login' ? '欢迎回来' : '创建账户'}</h1><p>{mode === 'login' ? '登录后管理收藏与评价' : '注册后即可收藏门店并发布评价'}</p><div className="account-mode"><button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError('') }}>登录</button><button className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setError('') }}>注册</button></div><form onSubmit={authenticate}>{mode === 'register' && <label>昵称<div><UserRound size={16}/><input autoComplete="nickname" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={40} required placeholder="最多 40 个字符"/></div></label>}<label>手机号<div><Phone size={16}/><input autoComplete="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} minLength={11} maxLength={11} pattern="1[3-9][0-9]{9}" required placeholder="请输入手机号"/></div></label><label>密码<div><LockKeyhole size={16}/><input autoComplete={mode === 'login' ? 'current-password' : 'new-password'} type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={10} maxLength={128} required placeholder={mode === 'register' ? '10–128 个字符' : '请输入密码'}/></div></label>{error && <p className="form-error" role="alert">{error}</p>}<button disabled={busy}>{busy && <LoaderCircle size={16}/>} {mode === 'login' ? '登录' : '注册并登录'}</button></form><small>密码仅发送给 Washjoy API，由服务端安全处理</small></>}</section></main>
}
