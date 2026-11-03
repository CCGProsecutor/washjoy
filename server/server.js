'use strict'
const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { execFile } = require('node:child_process')
const { promisify } = require('node:util')
const execFileAsync = promisify(execFile)
const DATA = process.env.WASHJOY_DATA_DIR || '/var/www/html/washjoy/private'
const UPLOADS = process.env.WASHJOY_UPLOAD_DIR || '/var/www/html/washjoy/uploads'
const ADMIN_PHONE = process.env.WASHJOY_ADMIN_PHONE
const PORT = Number(process.env.PORT || 3774)
const cities = { nanjing: '南京市', yangzhou: '扬州市', zhenjiang: '镇江市' }
const categories = ['洗浴中心', '大众澡堂', '足疗会所', '街边店', '私汤']
const ensure = dir => fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
ensure(DATA); ensure(UPLOADS)
const paths = Object.fromEntries(['users', 'overrides', 'limits'].map(k => [k, path.join(DATA, `${k}.json`)]))
const read = (key, fallback) => { try { return JSON.parse(fs.readFileSync(paths[key], 'utf8')) } catch { return fallback } }
const write = (key, value) => { const temp = `${paths[key]}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`; fs.writeFileSync(temp, JSON.stringify(value), { mode: 0o600 }); fs.renameSync(temp, paths[key]) }
const users = read('users', { users: {} })
const overrides = read('overrides', { cities: {}, manual: {} })
const limits = read('limits', { registrations: {}, loginFailures: {} })
const sessions = new Map()
const publicRoot = '/var/www/html/washjoy'
const send = (res, code, data, headers = {}) => { const body = JSON.stringify(data); res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers }); res.end(body) }
const readBody = (req, max = 11 * 1024 * 1024) => new Promise((resolve, reject) => { let size = 0, chunks = []; req.on('data', b => { size += b.length; if (size > max) { reject(Object.assign(new Error('请求内容过大'), { status: 413 })); req.destroy(); return } chunks.push(b) }); req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')) } catch { reject(Object.assign(new Error('JSON 格式错误'), { status: 400 })) } }); req.on('error', reject) })
const ipOf = req => String(req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim().slice(0, 80)
const validPhone = phone => /^1[3-9]\d{9}$/.test(String(phone || ''))
const hashPassword = (password, salt = crypto.randomBytes(16).toString('hex')) => ({ salt, hash: crypto.scryptSync(password, salt, 64).toString('hex') })
const validPassword = (password, record) => { if (!record || typeof password !== 'string') return false; const hash = crypto.scryptSync(password, record.salt, 64); return crypto.timingSafeEqual(hash, Buffer.from(record.hash, 'hex')) }
const adminRecord = users.users[ADMIN_PHONE]
if (!adminRecord && ADMIN_PHONE && process.env.WASHJOY_ADMIN_PASSWORD) { users.users[ADMIN_PHONE] = { ...hashPassword(process.env.WASHJOY_ADMIN_PASSWORD), phone: ADMIN_PHONE, role: 'admin', createdAt: new Date().toISOString(), profile: { displayName: 'Washjoy 管理员' } }; write('users', users) }
const sessionFor = req => { const bearer = String(req.headers.authorization || '').replace(/^Bearer\s+/i, ''); const cookie = String(req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith('washjoy_session='))?.slice('washjoy_session='.length) || ''; const token = bearer || cookie; const session = sessions.get(token); if (!session || session.expires < Date.now()) { sessions.delete(token); return null } return { ...session.user, token } }
const requireUser = (req, res, admin = false) => { const user = sessionFor(req); if (!user) { send(res, 401, { error: '请先登录' }); return null } if (admin && user.role !== 'admin') { send(res, 403, { error: '需要管理员权限' }); return null } return user }
const makeSession = user => { const token = crypto.randomBytes(32).toString('base64url'); sessions.set(token, { user: { phone: user.phone, role: user.role, profile: user.profile || {} }, expires: Date.now() + 12 * 60 * 60 * 1000 }); return token }
const normalizePhone = x => String(x || '').trim()
const writeOverrides = () => write('overrides', overrides)
const baseData = city => { const slug = city; if (!cities[slug]) return null; try { return JSON.parse(fs.readFileSync(path.join(publicRoot, 'data', `${slug}.json`), 'utf8')) } catch { return null } }
const mergedPlaces = city => { const data = baseData(city); if (!data) return null; const edits = overrides.cities[city] || {}; const rows = [];
  for (const base of data.pois || []) { const edit = edits[base.id]; if (edit?.deleted) continue; rows.push(edit ? { ...base, ...edit.fields, id: base.id, adminCategory: edit.category || edit.fields?.adminCategory, admin: true } : base) }
  for (const p of Object.values(overrides.manual).filter(x => x.city === city && !x.deleted)) rows.push({ ...p.fields, ...p, id: p.id, adminCategory: p.category, manual: true })
  return { ...data, source: `${data.source || '高德地图'} + Washjoy 管理数据`, pois: rows }
}
const toAdminPlace = (p, city, manual = false) => ({ id: p.id, city, name: p.name || '', category: p.adminCategory || p.category || '', type: p.type || '', address: p.address || '', area: p.adname || p.area || '', phone: p.tel || p.phone || '', price: p.biz_ext?.cost || p.cost || '', rating: p.biz_ext?.rating || p.rating || '', openTime: p.biz_ext?.open_time || p.open_time || '', description: p.description || p.service_summary || '', images: (p.photos || []).map(x => typeof x === 'string' ? x : x.url).filter(Boolean), techs: p.techs || [], services: p.services || '', manual })
const route = async (req, res) => {
  const url = new URL(req.url, 'http://localhost'); const parts = url.pathname.split('/').filter(Boolean); const method = req.method
  if (method === 'GET' && parts[0] === 'health') return send(res, 200, { ok: true })
  if (method === 'GET' && parts[0] === 'public-data') { const data = mergedPlaces(url.searchParams.get('city')); return data ? send(res, 200, data, { 'cache-control': 'public, max-age=60, stale-while-revalidate=300' }) : send(res, 404, { error: '城市不存在' }) }
  if (method === 'POST' && parts.join('/') === 'auth/register') {
    const ip = ipOf(req), now = Date.now(), last = limits.registrations[ip] || 0
    if (now - last < 30000) return send(res, 429, { error: `注册过于频繁，请 ${Math.ceil((30000 - (now - last)) / 1000)} 秒后重试` }, { 'retry-after': String(Math.ceil((30000 - (now - last)) / 1000)) })
    limits.registrations[ip] = now; write('limits', limits)
    const body = await readBody(req, 16000), phone = normalizePhone(body.phone), password = body.password
    if (!validPhone(phone)) return send(res, 400, { error: '请输入有效的中国大陆手机号' })
    if (typeof password !== 'string' || password.length < 10 || password.length > 128) return send(res, 400, { error: '密码长度需为 10 至 128 位' })
    if (users.users[phone]) return send(res, 409, { error: '该手机号已注册' })
    const record = { ...hashPassword(password), phone, role: phone === ADMIN_PHONE ? 'admin' : 'user', createdAt: new Date().toISOString(), profile: { displayName: String(body.displayName || '').trim().slice(0, 40) } }
    users.users[phone] = record; write('users', users)
    const token = makeSession(record); return send(res, 201, { user: { phone, role: record.role, createdAt: record.createdAt, profile: record.profile } }, { 'set-cookie': `washjoy_session=${token}; Path=/washjoy/api; HttpOnly; Secure; SameSite=Strict; Max-Age=43200` })
  }
  if (method === 'POST' && parts.join('/') === 'auth/login') {
    const body = await readBody(req, 16000), phone = normalizePhone(body.phone), ip = ipOf(req), key = `${ip}:${phone}`, now = Date.now(), entry = limits.loginFailures[key] || { count: 0, until: 0 }
    if (entry.until > now) return send(res, 429, { error: '登录尝试过多，请稍后再试' }, { 'retry-after': String(Math.ceil((entry.until - now) / 1000)) })
    const record = users.users[phone]
    if (!validPassword(body.password, record)) { entry.count++; if (entry.count >= 8) entry.until = now + 15 * 60 * 1000; limits.loginFailures[key] = entry; write('limits', limits); return send(res, 401, { error: '手机号或密码不正确' }) }
    delete limits.loginFailures[key]; write('limits', limits); const token = makeSession(record); return send(res, 200, { user: { phone, role: record.role, createdAt: record.createdAt, profile: record.profile || {} } }, { 'set-cookie': `washjoy_session=${token}; Path=/washjoy/api; HttpOnly; Secure; SameSite=Strict; Max-Age=43200` })
  }
  if (method === 'GET' && parts.join('/') === 'auth/me') { const u = requireUser(req, res); return u && send(res, 200, { phone: u.phone, role: u.role, profile: u.profile }) }
  if (method === 'POST' && parts.join('/') === 'auth/logout') { const u = sessionFor(req); if (u) sessions.delete(u.token); return send(res, 200, { ok: true }, { 'set-cookie': 'washjoy_session=; Path=/washjoy/api; HttpOnly; Secure; SameSite=Strict; Max-Age=0' }) }
  if (method === 'PUT' && parts.join('/') === 'auth/profile') { const u = requireUser(req, res); if (!u) return; const body = await readBody(req, 8000), record = users.users[u.phone]; record.profile = { ...(record.profile || {}), displayName: String(body.displayName || '').trim().slice(0, 40) }; write('users', users); return send(res, 200, { phone: u.phone, role: u.role, profile: record.profile }) }
  if (parts[0] !== 'admin') return send(res, 404, { error: 'not found' })
  const user = requireUser(req, res, true); if (!user) return
  if (method === 'GET' && parts[1] === 'places') { const city = url.searchParams.get('city'); const data = mergedPlaces(city); return data ? send(res, 200, { city, places: data.pois.map(p => toAdminPlace(p, city, Boolean(p.manual))) }) : send(res, 404, { error: '城市不存在' }) }
  if (method === 'PUT' && parts[1] === 'places' && parts[2]) {
    const id = decodeURIComponent(parts[2]), body = await readBody(req, 256000), city = body.city
    if (!cities[city] || !categories.includes(body.category)) return send(res, 400, { error: '城市或门店分类无效' })
    if (!String(body.name || '').trim()) return send(res, 400, { error: '门店名称必填' })
    const fields = { name: String(body.name).trim().slice(0, 100), address: String(body.address || '').trim().slice(0, 240), adname: String(body.area || '').trim().slice(0, 60), tel: String(body.phone || '').trim().slice(0, 50), description: String(body.description || '').trim().slice(0, 1200), services: String(body.services || '').trim().slice(0, 500), techs: Array.isArray(body.techs) ? body.techs.slice(0, 50).map(t => ({ name: String(t.name || '').slice(0, 80), title: String(t.title || '').slice(0, 80), bio: String(t.bio || '').slice(0, 600), specialties: Array.isArray(t.specialties) ? t.specialties.map(s => String(s).slice(0, 50)).slice(0, 20) : [], images: Array.isArray(t.images) ? t.images.map(s => String(s).slice(0, 600)).slice(0, 12) : [] })) : [] }
    fields.photos = Array.isArray(body.images) ? body.images.filter(x => typeof x === 'string' && /^https:\/\//.test(x)).slice(0, 20).map(url => ({ title: '', url })) : []
    fields.biz_ext = { cost: String(body.price || '').replace(/[^\d.]/g, '').slice(0, 12), rating: String(body.rating || '').replace(/[^\d.]/g, '').slice(0, 4), open_time: String(body.openTime || '').slice(0, 80) }
    const base = baseData(city), isBase = (base?.pois || []).some(p => p.id === id)
    if (!isBase && !overrides.manual[id] && !id.startsWith('manual-')) return send(res, 404, { error: '门店不存在' })
    if (isBase) overrides.cities[city] ||= {}, overrides.cities[city][id] = { category: body.category, fields, updatedAt: new Date().toISOString(), updatedBy: user.phone }
    else overrides.manual[id] = { id, city, category: body.category, fields, createdAt: overrides.manual[id]?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(), updatedBy: user.phone }
    writeOverrides(); return send(res, 200, { ok: true, id })
  }
  if (method === 'POST' && parts[1] === 'places') {
    const body = await readBody(req, 256000), id = `manual-${crypto.randomBytes(9).toString('hex')}`; body.id = id
    req.url = `/admin/places/${encodeURIComponent(id)}`
    const baseHandler = route; const fake = { ...req, method: 'PUT' }; fake.headers = req.headers; fake.socket = req.socket; fake._cachedBody = body
    return await saveManual(fake, res, body, user)
  }
  if (method === 'DELETE' && parts[1] === 'places' && parts[2]) { const id = decodeURIComponent(parts[2]), city = url.searchParams.get('city'), base = baseData(city); if ((base?.pois || []).some(p => p.id === id)) overrides.cities[city] ||= {}, overrides.cities[city][id] = { ...(overrides.cities[city][id] || {}), deleted: true }; else if (overrides.manual[id]) overrides.manual[id].deleted = true; else return send(res, 404, { error: '门店不存在' }); writeOverrides(); return send(res, 200, { ok: true }) }
  if (method === 'POST' && parts[1] === 'upload') {
    const body = await readBody(req, 11 * 1024 * 1024), mime = String(body.mime || ''), allowed = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }[mime]
    if (!allowed || typeof body.data !== 'string') return send(res, 400, { error: '仅支持 JPG、PNG、WebP 图片' })
    const bytes = Buffer.from(body.data.replace(/^data:[^,]+,/, ''), 'base64'); if (!bytes.length || bytes.length > 8 * 1024 * 1024) return send(res, 413, { error: '图片需小于 8 MB' })
    const name = `${crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 32)}${allowed}`, local = path.join(UPLOADS, name), object = `oss://${process.env.WASHJOY_OSS_BUCKET || 'fehd'}/${process.env.WASHJOY_OSS_PREFIX || 'washjoy/uploads'}/${name}`
    fs.writeFileSync(local, bytes, { flag: 'wx', mode: 0o644 })
    await execFileAsync('/usr/local/bin/aliyun', ['ossutil', 'cp', local, object, '--acl', 'public-read', '--cache-control', 'public, max-age=31536000, immutable', '--content-type', mime], { timeout: 60000 })
    return send(res, 201, { url: `${process.env.WASHJOY_OSS_BASE || 'https://fehd.oss-cn-shanghai.aliyuncs.com/washjoy/uploads'}/${name}`, backup: 'local + scheduled encrypted GitHub backup', name })
  }
  return send(res, 404, { error: 'not found' })
}
async function saveManual(req, res, body, user) { const city = body.city; if (!cities[city] || !categories.includes(body.category) || !String(body.name || '').trim()) return send(res, 400, { error: '请填写城市、分类和门店名称' }); const id = body.id; const images = Array.isArray(body.images) ? body.images.filter(x => /^https:\/\//.test(String(x))).slice(0, 20).map(url => ({ title: '', url })) : []; const fields = { name: String(body.name).trim().slice(0,100), address: String(body.address||'').trim().slice(0,240), adname: String(body.area||'').slice(0,60), tel: String(body.phone||'').slice(0,50), location: String(body.location||'').slice(0,60), photos: images, description: String(body.description||'').slice(0,1200), services: String(body.services||'').slice(0,500), techs: Array.isArray(body.techs)?body.techs.slice(0,50):[], biz_ext:{cost:String(body.price||'').replace(/[^\d.]/g,'').slice(0,12),rating:String(body.rating||'').replace(/[^\d.]/g,'').slice(0,4),open_time:String(body.openTime||'').slice(0,80)} }; overrides.manual[id]={id,city,category,fields,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),updatedBy:user.phone};writeOverrides();return send(res,201,{ok:true,id}) }
const server = http.createServer(async (req, res) => { try { await route(req, res) } catch (error) { console.error('Washjoy API error', error); if (!res.headersSent) send(res, error.status || 500, { error: error.status ? error.message : '服务暂时不可用' }) } })
server.listen(PORT, '127.0.0.1', () => console.log(`Washjoy API listening on 127.0.0.1:${PORT}`))
