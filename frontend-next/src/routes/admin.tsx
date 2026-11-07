import { Button, Input, Modal, TextArea } from '@heroui/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Check, ChevronRight, CircleAlert, ImagePlus, LoaderCircle, Plus, RotateCcw, Save, Search, ShieldCheck, Trash2 } from 'lucide-react'
import { api, getSession, type User } from '../lib/api'
import '../styles/account-admin.css'

type AdminPlace = { id: string; city: string; name: string; category: string; address: string; area: string; phone: string; price: string; rating: string; openTime: string; description: string; services: string; images: string[]; techs: string[]; location: string; recommended: boolean }
const blank = (): AdminPlace => ({ id: '', city: 'nanjing', name: '', category: '洗浴中心', address: '', area: '', phone: '', price: '', rating: '', openTime: '', description: '', services: '', images: [], techs: [], location: '', recommended: false })

export default function Admin() {
  const [user, setUser] = useState<User | null>(null)
  const [places, setPlaces] = useState<AdminPlace[]>([])
  const [trash, setTrash] = useState<AdminPlace[]>([])
  const [reviews, setReviews] = useState<Array<{id:number;placeName:string;rating:number;text:string;author:string;created:number}>>([])
  const [selectedId, setSelectedId] = useState('')
  const selectedIdRef = useRef(selectedId)
  selectedIdRef.current = selectedId
  const [form, setForm] = useState<AdminPlace>(blank())
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'basic'|'images'|'reviews'|'trash'>('basic')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [mobileEdit, setMobileEdit] = useState(false)
  const [confirmPlace, setConfirmPlace] = useState<AdminPlace | null>(null)
  const [confirmReview, setConfirmReview] = useState<number | null>(null)
  const visible = useMemo(() => places.filter((place) => `${place.name} ${place.address} ${place.area}`.toLowerCase().includes(search.toLowerCase())), [places, search])

  const load = useCallback(async (keep = '') => {
    const data = await api<{places:AdminPlace[]}>('admin/places?city=nanjing')
    setPlaces(data.places || [])
    const id = keep || selectedIdRef.current || data.places?.[0]?.id || ''
    setSelectedId(id)
    const place = data.places?.find((item) => item.id === id)
    if (place) setForm({...place})
  }, [])
  const loadTrash = useCallback(async () => { const data = await api<{places:AdminPlace[]}>('admin/trash?city=nanjing'); setTrash(data.places || []) }, [])
  const loadReviews = useCallback(async () => { const data = await api<{reviews:Array<{id:number;placeName:string;rating:number;text:string;author:string;created:number}>}>(`admin/reviews?placeId=${encodeURIComponent(selectedId)}&city=nanjing`); setReviews(data.reviews || []) }, [selectedId])

  useEffect(() => {
    let active = true
    void getSession().then(async (session) => {
      if (!active) return
      if (!session || session.role !== 'admin') { setUser(null); setError(session ? '此账号没有管理员权限' : '请先登录管理员账号'); return }
      setUser(session)
      try { await load(); await loadTrash() } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : '后台数据加载失败') }
    })
    return () => { active = false }
  }, [load, loadTrash])

  useEffect(() => { if (tab === 'reviews' && user && selectedId) void loadReviews().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : '评价加载失败')) }, [tab, selectedId, user, loadReviews])

  async function save() {
    if (!selectedId || !form.name.trim()) { setError('门店名称必填'); return }
    setBusy(true); setError(''); setMessage('')
    try {
      await api(`admin/places/${encodeURIComponent(selectedId)}`, { method: 'PUT', body: JSON.stringify(form) })
      await load(selectedId); setMessage('门店已保存')
    } catch (cause) { setError(cause instanceof Error ? cause.message : '保存失败，表单内容已保留') }
    finally { setBusy(false) }
  }

  async function create() {
    setBusy(true); setError('')
    try {
      const data = await api<{id:string}>('admin/places', { method: 'POST', body: JSON.stringify({...blank(), name:'新建门店'}) })
      await load(data.id); setMobileEdit(true); setMessage('新门店已创建')
    } catch (cause) { setError(cause instanceof Error ? cause.message : '创建失败') }
    finally { setBusy(false) }
  }

  async function remove(place: AdminPlace) {
    setBusy(true); setError('')
    try { await api(`admin/places/${encodeURIComponent(place.id)}?city=nanjing`, {method:'DELETE'}); await load(); await loadTrash(); setMessage('门店已移入回收站') }
    catch (cause) { setError(cause instanceof Error ? cause.message : '删除失败') }
    finally { setBusy(false) }
  }

  async function removeReview(id: number) {
    try { await api(`admin/reviews/${id}`, { method: 'DELETE' }); await loadReviews(); setMessage('评价已删除') }
    catch (cause) { setError(cause instanceof Error ? cause.message : '删除评价失败') }
    finally { setConfirmReview(null) }
  }

  async function restore(place: AdminPlace) {
    try { await api(`admin/places/${encodeURIComponent(place.id)}/restore?city=nanjing`, {method:'POST'}); await load(); await loadTrash(); setMessage('门店已恢复') }
    catch (cause) { setError(cause instanceof Error ? cause.message : '恢复失败') }
  }

  async function uploadImages(files: FileList | null) {
    if (!files?.length) return
    setBusy(true); setError('')
    try {
      const additions = await Promise.all(Array.from(files).map(async (file) => {
        const buffer = await file.arrayBuffer(); const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
        const result = await api<{url:string}>('admin/upload', {method:'POST',body:JSON.stringify({filename:file.name,mime:file.type,data:base64})})
        return result.url
      }))
      setForm((current) => ({...current,images:[...current.images,...additions]}))
    } catch (cause) { setError(cause instanceof Error ? cause.message : '图片上传失败') }
    finally { setBusy(false) }
  }

  if (!user) return <main className="admin-gate"><a href="/washjoy/"><ArrowLeft size={17}/>返回地图</a><section><ShieldCheck size={30}/><h1>{error || '管理员验证中'}</h1>{error && <a href="/washjoy/account/">前往登录</a>}</section></main>

  const input = (label: string, key: keyof AdminPlace, props: React.ComponentProps<typeof Input> = {}) => <label className="admin-field"><span>{label}</span><Input aria-label={label} value={String(form[key] || '')} onChange={(event) => setForm({ ...form, [key]: event.target.value })} {...props} /></label>
  return <main className="admin-app">
    <header className="admin-topbar"><a href="/washjoy/"><ArrowLeft size={17}/><span>Washjoy</span></a><h1>门店管理</h1><span className="admin-user">{user.profile?.displayName || user.phone}</span></header>
    <div className="admin-layout">
      <aside className={`admin-list ${mobileEdit ? 'hide-mobile' : ''}`}>
        <div className="admin-list-head"><div><strong>南京门店</strong><span>{places.length} 家</span></div><Button isIconOnly aria-label="新建门店" onPress={() => void create()}><Plus size={17}/></Button></div>
        <label className="admin-search"><Search size={15}/><Input value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="搜索门店" aria-label="搜索门店"/></label>
        <nav className="admin-tabs">{(['basic','images','reviews','trash'] as const).map((item)=><button className={tab===item?'active':''} key={item} onClick={()=>{setTab(item);if(item==='trash')void loadTrash()}}>{({basic:'门店',images:'编辑',reviews:'评价',trash:'回收站'})[item]}</button>)}</nav>
        <div className="admin-place-list">{(tab==='trash'?trash:visible).map((place)=><button className={`admin-place-option ${place.id===selectedId?'active':''}`} key={place.id} onClick={()=>{if(tab==='trash'){void restore(place);return}setSelectedId(place.id);setForm({...place});setMobileEdit(true)}}><div><strong>{place.name}</strong><span>{place.category} · {place.area || place.address}</span></div>{tab==='trash'?<RotateCcw size={16}/>:<ChevronRight size={16}/>}</button>)}{!visible.length&&tab!=='trash'&&<p className="admin-empty">没有匹配门店</p>}</div>
      </aside>
      <section className={`admin-editor ${mobileEdit?'show-mobile':''}`}>
        <div className="editor-heading"><button className="mobile-back" onClick={()=>setMobileEdit(false)}><ArrowLeft size={17}/>列表</button><div><span>{form.category || '门店'}</span><h2>{form.name || '选择门店'}</h2></div><div className="editor-actions"><Button isIconOnly className="delete-action" onPress={()=>setConfirmPlace(form)} isDisabled={!selectedId||busy} aria-label="移入回收站"><Trash2 size={16}/></Button><Button className="save-action" onPress={()=>void save()} isDisabled={!selectedId||busy}>{busy?<LoaderCircle size={16}/>:<Save size={16}/>}保存</Button></div></div>
        {error&&<p className="admin-alert" role="alert"><CircleAlert size={15}/>{error}</p>}{message&&<p className="admin-success" role="status"><Check size={15}/>{message}</p>}
        {tab==='trash'?<section className="admin-panel"><h3>回收站</h3>{trash.map((place)=><div className="trash-row" key={place.id}><span>{place.name}</span><Button onPress={()=>void restore(place)}><RotateCcw size={15}/>恢复</Button></div>)}</section>
          :tab==='reviews'?<section className="admin-panel"><h3>门店评价</h3>{reviews.map((review)=><article className="admin-review" key={review.id}><div><strong>{review.placeName}</strong><span>{'★'.repeat(review.rating)} · {review.author}</span></div><p>{review.text}</p><Button isIconOnly aria-label="删除评价" onPress={()=>setConfirmReview(review.id)}><Trash2 size={14}/></Button></article>)}</section>
          :tab==='images'?<section className="admin-panel"><h3>门店图片</h3><label className="upload-drop"><ImagePlus size={23}/><span>选择图片上传</span><input type="file" accept="image/*" multiple onChange={(event)=>void uploadImages(event.target.files)}/></label><div className="admin-images">{form.images.map((url,index)=><figure key={`${url}-${index}`}><img src={url} alt=""/><Button isIconOnly aria-label="移除图片" onPress={()=>setForm({...form,images:form.images.filter((_,i)=>i!==index)})}><Trash2 size={13}/></Button></figure>)}</div></section>
          :<section className="admin-panel"><div className="admin-field-grid">{input('门店名称','name')}
            <label className="admin-field"><span>门店分类</span><select value={form.category} onChange={(event)=>setForm({...form,category:event.target.value})}>{['洗浴中心','大众澡堂','足疗会所','街边店','私汤'].map((item)=><option key={item}>{item}</option>)}</select></label>
            {input('区域','area')}{input('联系电话','phone')}{input('人均价格','price')}{input('营业时间','openTime')}{input('地址','address',{className:'admin-full'})}{input('经纬度','location',{placeholder:'经度,纬度',className:'admin-full'})}
            <label className="admin-field admin-full"><span>服务介绍</span><TextArea value={form.services} onChange={(event)=>setForm({...form,services:event.target.value})}/></label><label className="admin-field admin-full"><span>详细介绍</span><TextArea value={form.description} onChange={(event)=>setForm({...form,description:event.target.value})}/></label>
            <label className="toggle-field"><input type="checkbox" checked={form.recommended} onChange={(event)=>setForm({...form,recommended:event.target.checked})}/>站长推荐</label></div></section>}
      </section>
    </div>
    <Modal><Modal.Backdrop isOpen={confirmPlace !== null || confirmReview !== null} onOpenChange={(open) => { if (!open) { setConfirmPlace(null); setConfirmReview(null) } }} className="wj-admin-modal-backdrop"><Modal.Container placement="center"><Modal.Dialog className="wj-admin-modal"><Modal.Header><Modal.Heading>{confirmPlace ? '移入回收站' : '删除评价'}</Modal.Heading><Modal.CloseTrigger aria-label="关闭确认" /></Modal.Header><Modal.Body><p>{confirmPlace ? `将“${confirmPlace.name}”移入回收站？可在回收站恢复。` : '删除后无法恢复这条评价。'}</p></Modal.Body><Modal.Footer><Button onPress={() => { setConfirmPlace(null); setConfirmReview(null) }}>取消</Button><Button className="wj-admin-danger" onPress={() => { if (confirmPlace) void remove(confirmPlace).then(() => setConfirmPlace(null)); if (confirmReview !== null) void removeReview(confirmReview) }}>确认删除</Button></Modal.Footer></Modal.Dialog></Modal.Container></Modal.Backdrop></Modal>
  </main>
}
