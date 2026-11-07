<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowLeft, Check, ChevronLeft, ChevronRight, Image as ImageIcon, LogOut, MessageSquareText, Plus, RotateCcw, Save, Search, Star, Store, Tags, Trash2, Upload, Wrench, X } from 'lucide-svelte';
  import { api, BASE, categories, cityRows, spaImage } from '#lib/api';

  const initial = () => ({ id: '', name: '', category: '洗浴中心', area: '', address: '', phone: '', price: '', rating: '', openTime: '', description: '', services: '', images: [] as string[], techs: [] as any[], location: '', recommended: false, manual: true, city: 'nanjing' });
  const tabs = [['basic','基本信息'],['images','门店图片'],['techs','技师资料'],['reviews','门店评价']];
  const presetTags = ['汗蒸','泡汤','搓背','足疗','按摩','采耳','自助餐','免费停车','包厢','24 小时','私汤'];
  let user: any = null;
  let login = { phone: '', password: '' };
  let error = '';
  let city = 'nanjing';
  let mode = 'places';
  let places: any[] = [];
  let trash: any[] = [];
  let selected = '';
  let form: any = initial();
  let tab = 'basic';
  let search = '';
  let busy = false;
  let dirty = false;
  let view = 'list';
  let toast = '';
  let confirmInfo: any = null;
  let tagLib: string[] = [];
  let storeReviews: any[] = [];
  let newTag = '';
  let list: any[] = [];
  let fileInput: HTMLInputElement;
  let draggingImage = -1;
  const cityName = () => cityRows.find((x) => x.id === city)?.name || '南京市';
  $: selectedPlace = places.find((p) => String(p.id) === String(selected));
  const notify = (message: string) => { toast = message; setTimeout(() => toast = '', 2600); };
  function fromRow(row: any) { return { ...initial(), ...row, city, images: row.images || [], techs: row.techs || [], location: typeof row.location === 'string' ? row.location : row.location?.lng ? `${row.location.lng},${row.location.lat}` : '' }; }
  async function load(c = city, keep = '') { const d: any = await api(`admin/places?city=${c}`); places = d.places || []; selected = String(keep || places[0]?.id || ''); const row = places.find((p) => String(p.id) === selected); form = row ? fromRow(row) : initial(); dirty = false; tab = 'basic'; }
  async function loadTrash() { const d: any = await api(`admin/trash?city=${city}`); trash = d.places || []; }
  async function loadReviews(id = selected) { const d: any = await api(`admin/reviews?placeId=${encodeURIComponent(id)}&city=${city}`); storeReviews = d.reviews || []; }
  async function loadTags() { try { const d: any = await api(`admin/tags?city=${city}`); tagLib = d.tags || []; } catch {} }
  onMount(async () => { try { user = await api('auth/me'); if (user.role !== 'admin') { user = null; error = '此账号没有管理员权限'; } else { await load(); await loadTags(); } } catch {} });
  $: list = (mode === 'trash' ? trash : places).filter((p) => `${p.name} ${p.area} ${p.address}`.toLowerCase().includes(search.trim().toLowerCase()));
  $: serviceTags = String(form.services || '').split('|').map((s: string) => s.trim()).filter(Boolean);
  $: library = [...new Set([...tagLib, ...presetTags])];
  $: if (user && tab === 'reviews' && selected) loadReviews().catch((e) => notify(e.message));
  async function submitLogin(event: SubmitEvent) { event.preventDefault(); error = ''; try { const d: any = await api('auth/login', { method: 'POST', body: JSON.stringify(login) }); if (d.user.role !== 'admin') throw new Error('此手机号不是管理员账号'); user = d.user; await load(); await loadTags(); } catch (e: any) { error = e.message; } }
  function choose(place: any) { selected = String(place.id); form = fromRow(place); tab = 'basic'; dirty = false; view = 'edit'; window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }); }
  function set(key: string, value: any) { form = { ...form, [key]: value }; dirty = true; }
  function moveImage(from: number, to: number) { if (from < 0 || to < 0 || from >= form.images.length || to >= form.images.length || from === to) return; const images = [...form.images]; const [item] = images.splice(from, 1); images.splice(to, 0, item); set('images', images); draggingImage = -1; }
  function startImageDrag(event: DragEvent, index: number) { draggingImage = index; event.dataTransfer?.setData('text/plain', String(index)); if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'; }
  function dropImage(event: DragEvent, index: number) { event.preventDefault(); const from = Number(event.dataTransfer?.getData('text/plain') || draggingImage); moveImage(from, index); }
  function setTech(i: number, key: string, value: any) { const techs = [...form.techs]; techs[i] = { ...techs[i], [key]: value }; set('techs', techs); }
  async function save(event?: SubmitEvent) { event?.preventDefault(); if (!selected) return; busy = true; try { await api(`admin/places/${encodeURIComponent(selected)}`, { method: 'PUT', body: JSON.stringify({ ...form, city }) }); const stamp = String(Date.now()); localStorage.setItem('washjoy:data-updated', stamp); window.dispatchEvent(new Event('washjoy:data-updated')); if ('BroadcastChannel' in window) { const ch = new BroadcastChannel('washjoy-data'); ch.postMessage({ type: 'places-updated', city, id: selected, stamp }); ch.close(); } notify('门店已保存'); await load(city, selected); await loadTags(); } catch (e: any) { notify(e.message); } finally { busy = false; } }
  async function add() { try { const d: any = await api('admin/places', { method: 'POST', body: JSON.stringify({ ...initial(), city, name: '新建门店' }) }); await load(city, d.id); view = 'edit'; } catch (e: any) { notify(e.message); } }
  async function confirmAction() { const c = confirmInfo; confirmInfo = null; if (!c) return; busy = true; try { if (c.kind === 'delete') { await api(`admin/places/${encodeURIComponent(c.id)}?city=${city}`, { method: 'DELETE' }); await load(city); await loadTrash(); } else { await api(`admin/trash/${encodeURIComponent(c.id)}?city=${city}`, { method: 'DELETE' }); await loadTrash(); } notify(c.kind === 'delete' ? '已移入回收站' : '已彻底删除'); } catch (e: any) { notify(e.message); } finally { busy = false; } }
  async function restore(place: any) { try { await api(`admin/places/${encodeURIComponent(place.id)}/restore?city=${city}`, { method: 'POST' }); await loadTrash(); await load(city, place.id); notify('门店已恢复'); } catch (e: any) { notify(e.message); } }
  async function upload(files: FileList | null, techIndex = -1) { if (!files) return; for (const file of Array.from(files)) { if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) { notify('图片需为 JPG、PNG 或 WebP，且小于 8 MB'); continue; } const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); }); try { const d: any = await api('admin/upload', { method: 'POST', body: JSON.stringify({ mime: file.type, data }) }); if (techIndex < 0) set('images', [...form.images, d.url]); else setTech(techIndex, 'images', [...(form.techs[techIndex].images || []), d.url]); notify('图片已备份并上传 OSS'); } catch (e: any) { notify(e.message); } } }
  async function logout() { await api('auth/logout', { method: 'POST' }).catch(() => {}); user = null; }
  function toggleTag(tag: string) { set('services', (serviceTags.includes(tag) ? serviceTags.filter((x: string) => x !== tag) : [...serviceTags, tag]).join('|')); }
  function addTag() { const tag = newTag.trim().slice(0, 24); if (tag && !serviceTags.includes(tag)) set('services', [...serviceTags, tag].join('|')); newTag = ''; }
</script>

<svelte:head><title>门店管理 · Washjoy</title></svelte:head>
{#if !user}
  <main class="admin-login"><form class="admin-login-card" onsubmit={submitLogin}><a href={`${BASE}/`} class="admin-back"><ArrowLeft size={17}/>返回首页</a><img class="brand-mark" src={`${BASE}/assets/washjoy-mark.svg`} alt=""/><h1>门店管理</h1><p>Washjoy 管理员后台 · 手机号与密码登录</p><label>手机号<input required inputmode="tel" bind:value={login.phone}/></label><label>管理员密码<input required type="password" bind:value={login.password}/></label><button class="primary">登录</button>{#if error}<p class="error">{error}</p>{/if}</form></main>
{:else}
  <div class="admin-app">
    <header class="admin-topbar"><button class="back-button" onclick={() => view = 'list'}><ChevronLeft size={18}/></button><a href={`${BASE}/`} class="brand"><img class="brand-mark" src={`${BASE}/assets/washjoy-mark.svg`} alt=""/><span>Washjoy<small>门店管理</small></span></a><div><span>{user.phone}</span><button class="icon-button" onclick={logout} aria-label="退出"><LogOut size={17}/></button></div></header>
    <div class="admin-layout">
      <aside class:collapsed={view === 'edit'} class="store-sidebar"><div class="admin-heading"><div><small>{cityName()}</small><h1>{mode === 'trash' ? '回收站' : '门店'}</h1></div><span>{list.length}</span></div>
        <div class="admin-switch"><button class:active={mode === 'places'} onclick={async () => { mode = 'places'; await load(); }}>门店</button><button class:active={mode === 'trash'} onclick={async () => { mode = 'trash'; await loadTrash(); }}>回收站</button></div>
        <div class="admin-cities">{#each cityRows as c}<button class:active={city === c.id} onclick={async () => { city = c.id; await load(); await loadTags(); if (mode === 'trash') await loadTrash(); }}>{c.name}</button>{/each}</div>
        <label class="admin-search"><Search size={16}/><input bind:value={search} placeholder="搜索门店名称、区域"/></label>
        <div class="store-list">{#each list as place (place.id)}{#if mode === 'places'}<button class:active={selected === place.id} class="store-row" onclick={() => choose(place)}><img src={place.images?.[0] || spaImage} alt=""/><span><b>{place.name}</b><small>{place.category} · {place.area || '未设置区域'}</small></span>{#if place.recommended}<Star size={14} fill="currentColor" class="gold-star"/>{/if}<ChevronRight size={15}/></button>{:else}<div class="store-row trash-row"><img src={place.images?.[0] || spaImage} alt=""/><span><b>{place.name}</b><small>{place.category} · {place.area}</small></span><button onclick={() => restore(place)} aria-label="恢复"><RotateCcw size={15}/></button>{#if place.manual}<button onclick={() => confirmInfo = { kind: 'purge', ...place }} aria-label="彻底删除"><Trash2 size={15}/></button>{/if}</div>{/if}{/each}{#if mode === 'places'}<button class="new-store" onclick={add}><Plus size={16}/>新建门店</button>{/if}</div>
      </aside>
      <main class:active={view === 'edit'} class="admin-editor">
        {#if !selectedPlace}<div class="empty-state"><Store size={30}/><b>选择一家门店</b><p>从列表选择门店，或新建手工门店</p><button class="primary" onclick={add}><Plus size={16}/>新建门店</button></div>
        {:else}<div class="editor-hero"><img src={form.images[0] || spaImage} alt=""/><div><h2>{form.name || '未命名门店'}</h2><p>{form.category} · {form.area || '未设置区域'} · {selectedPlace.manual ? '手工门店' : '高德门店'}</p></div><button class="danger-icon" onclick={() => confirmInfo = { kind: 'delete', ...selectedPlace }} aria-label="删除门店"><Trash2 size={17}/></button></div>
          <nav class="editor-tabs">{#each tabs as item}<button class:active={tab === item[0]} onclick={() => tab = item[0]}>{#if item[0] === 'basic'}<Store size={15}/>{:else if item[0] === 'images'}<ImageIcon size={15}/>{:else if item[0] === 'techs'}<Wrench size={15}/>{:else}<MessageSquareText size={15}/>{/if}{item[1]}</button>{/each}</nav>
          {#if tab === 'basic'}<section class="editor-card"><h3>门店信息</h3><div class="field-grid"><label>门店名称<input required bind:value={form.name} oninput={() => dirty = true}/></label><label>业务分类<select bind:value={form.category} onchange={() => dirty = true}>{#each categories.slice(1) as c}<option>{c}</option>{/each}</select></label><label>所在区域<input bind:value={form.area} oninput={() => dirty = true}/></label><label>联系电话<input inputmode="tel" bind:value={form.phone} oninput={() => dirty = true}/></label><label class="full">详细地址<input bind:value={form.address} oninput={() => dirty = true}/></label><label>经纬度<input bind:value={form.location} placeholder="118.762590,32.080090" oninput={() => dirty = true}/><small>格式 lng,lat</small></label><label>营业时间<input bind:value={form.openTime} oninput={() => dirty = true}/></label><label>参考人均（元）<input bind:value={form.price} inputmode="decimal" oninput={() => dirty = true}/></label><label>评分<input bind:value={form.rating} inputmode="decimal" oninput={() => dirty = true}/></label></div><h3><Tags size={15}/>服务和设施</h3><div class="tag-cloud">{#each serviceTags as t}<button class="selected" onclick={() => toggleTag(t)}>{t}<X size={12}/></button>{/each}{#each library as t}{#if !serviceTags.includes(t)}<button onclick={() => toggleTag(t)}>{t}</button>{/if}{/each}</div><div class="tag-add"><input bind:value={newTag} placeholder="新建标签" onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}/><button onclick={addTag}><Plus size={14}/>添加</button></div><label class="block-label">门店介绍<textarea bind:value={form.description} oninput={() => dirty = true}></textarea></label><label class="recommend-switch"><input type="checkbox" bind:checked={form.recommended} onchange={() => dirty = true}/><span><b>站长推荐</b><small>开启后出现在首页「站长推荐」筛选</small></span></label></section>
          {:else if tab === 'images'}<section class="editor-card"><h3>门店图片</h3><div class="image-grid">{#each form.images as url, i}<figure class:dragging={draggingImage === i} draggable="true" ondragstart={(event) => startImageDrag(event, i)} ondragover={(event) => event.preventDefault()} ondrop={(event) => dropImage(event, i)} ondragend={() => draggingImage = -1}><img src={url} alt="门店图片"/><span class="image-order-label">{i === 0 ? '主图' : `第 ${i + 1} 张`}</span><button class="image-remove" onclick={() => set('images', form.images.filter((_: string, j: number) => i !== j))} aria-label="移除"><X size={13}/></button><button class="image-order image-order-left" disabled={i === 0} onclick={() => moveImage(i, i - 1)} aria-label="向前移动一张">←</button><button class="image-order image-order-right" disabled={i === form.images.length - 1} onclick={() => moveImage(i, i + 1)} aria-label="向后移动一张">→</button></figure>{/each}<button class="upload-box" onclick={() => fileInput?.click()}><Upload size={19}/>上传图片</button><input bind:this={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onchange={(e) => upload(e.currentTarget.files)}/></div><p class="hint">拖动图片调整顺序，第一张会作为门店主图。也可使用图片上的左右按钮。JPG、PNG、WebP，单张不超过 8 MB。</p><label class="block-label">图片地址<textarea value={form.images.join('\n')} oninput={(e) => set('images', e.currentTarget.value.split('\n').map((x) => x.trim()).filter(Boolean))}></textarea></label></section>
          {:else if tab === 'techs'}<section class="editor-card"><h3>门店技师</h3>{#each form.techs as tech, i}<div class="tech-editor"><div class="tech-title"><b>技师 {i + 1}</b><button onclick={() => set('techs', form.techs.filter((_: any, j: number) => i !== j))}><Trash2 size={14}/>移除</button></div><div class="field-grid"><label>姓名<input bind:value={tech.name} oninput={() => dirty = true}/></label><label>岗位 / 职称<input bind:value={tech.title} oninput={() => dirty = true}/></label><label class="full">照片地址<input value={(tech.images || []).join(',')} oninput={(e) => setTech(i, 'images', e.currentTarget.value.split(',').map((x) => x.trim()).filter(Boolean))}/></label><label class="full">技师介绍<textarea bind:value={tech.bio} oninput={() => dirty = true}></textarea></label><label class="full">擅长项目<input value={(tech.specialties || []).join(',')} oninput={(e) => setTech(i, 'specialties', e.currentTarget.value.split(',').map((x) => x.trim()).filter(Boolean))}/></label></div></div>{/each}<button class="secondary-button" onclick={() => set('techs', [...form.techs, { name: '', title: '', images: [], bio: '', specialties: [] }])}><Plus size={15}/>添加技师</button></section>
          {:else}<section class="editor-card"><h3>门店评价</h3>{#each storeReviews as review}<article class="review-row"><div><b>{review.author}　<span>{'★'.repeat(review.rating)}</span></b><small>{new Date(review.created * 1000).toLocaleDateString('zh-CN')}</small><p>{review.text}</p></div><button class="danger-icon" onclick={async () => { await api(`admin/reviews/${review.id}`, { method: 'DELETE' }); await loadReviews(); notify('评价已删除'); }}><Trash2 size={14}/></button></article>{:else}<p class="hint">这家门店还没有本站评价。</p>{/each}</section>{/if}
          <div class="savebar"><span class:dirty>{dirty ? '有未保存的修改' : '已是最新'}</span><button class="primary" disabled={busy} onclick={save}>{#if busy}<span class="spinner"></span>{:else}<Save size={16}/>{/if}{busy ? '保存中' : '保存'}</button></div>
        {/if}
      </main>
    </div>
  </div>
{/if}
{#if toast}<div class="toast">{toast}</div>{/if}
{#if confirmInfo}<div class="modal-backdrop"><section class="confirm-card" role="dialog" aria-modal="true"><h2>{confirmInfo.kind === 'delete' ? '删除门店？' : '彻底删除？'}</h2><p>{confirmInfo.kind === 'delete' ? `「${confirmInfo.name}」会移入回收站，之后可以恢复。` : `「${confirmInfo.name}」将彻底移除，无法恢复。`}</p><div><button onclick={() => confirmInfo = null}>取消</button><button class="danger-button" onclick={confirmAction}>{confirmInfo.kind === 'delete' ? '移入回收站' : '彻底删除'}</button></div></section></div>{/if}
