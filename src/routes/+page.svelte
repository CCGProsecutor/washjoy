<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { Heart, LocateFixed, MapPin, Search, Star, UserRound, X, ChevronRight, TrainFront, Bike, CarFront, Clock3, SlidersHorizontal, MessageSquareText } from 'lucide-svelte';
  import { api, BASE, categories, cityRows, distanceKm, estimateMinutes, normalizePlace, spaImage } from '#lib/api';

  type Place = ReturnType<typeof normalizePlace> & { minutes?: number; distance?: number; cityId?: string };
  let city = cityRows[0];
  let mode = 'transit';
  let category = '全部';
  let timeLimit = 30;
  let filtersExpanded = false;
  let query = '';
  let recommendedOnly = false;
  let recommendedRefined = false;
  let places: Place[] = [];
  let status = 'loading';
  let visibleCount = 30;
  let locationLabel = '开启定位后推荐附近门店';
  let locationCoords: [number, number] | null = null;
  let detail: Place | null = null;
  let gallery = 0;
  let loginPrompt = false;
  let reviewText = '';
  let reviewRating = 5;
  let reviews: any[] = [];
  let reviewLoading = false;
  let authUser: any = null;
  let toast = '';
  let favorites: string[] = [];
  let touchX = 0;
  let zoomOpen = false;
  let zoomScale = 1;
  let mapNode: HTMLDivElement;
  let map: any = null;
  let mapSdk: any = null;

  const notify = (message: string) => { toast = message; setTimeout(() => toast = '', 2200); };
  const origin = () => locationCoords || city.coords;
  async function load() {
    status = 'loading';
    try {
      const data = await api<any>(`public-data?city=${city.id}`);
      const unique = new Map<string, Place>();
      (data.pois || []).forEach((p: any, i: number) => { const row = { ...normalizePlace(p, city.name, i), cityId: city.id } as Place; unique.set(row.id, row); });
      places = [...unique.values()]; status = places.length ? 'ready' : 'empty'; visibleCount = 30;
      await tick(); renderMap();
    } catch { places = []; status = 'error'; }
  }
  async function renderMap() {
    if (!mapNode || typeof window === 'undefined') return;
    try {
      if (!mapSdk) {
        const { default: AMapLoader } = await import('@amap/amap-jsapi-loader');
        const key = import.meta.env.VITE_AMAP_KEY;
        const securityJsCode = import.meta.env.VITE_AMAP_SECURITY_JS_CODE;
        if (!key) return;
        if (securityJsCode) (window as any)._AMapSecurityConfig = { securityJsCode };
        mapSdk = await AMapLoader.load({ key, version: '2.0', plugins: ['AMap.Scale', 'AMap.ToolBar'] });
      }
      const center = locationCoords || city.coords;
      if (!map) map = new mapSdk.Map(mapNode, { zoom: 12, center, viewMode: '2D', mapStyle: 'amap://styles/normal', resizeEnable: true });
      else map.setCenter(center);
      map.clearMap();
      loaded.slice(0, 30).forEach((place) => {
        if (!place.coords) return;
        const marker = new mapSdk.Marker({ position: place.coords, title: place.name, content: `<button class="amap-pin" aria-label="${place.name}">${place.minutes || ''}<small>分</small></button>`, anchor: 'bottom-center' });
        marker.on('click', () => openDetail(place));
        marker.setMap(map);
      });
      if (locationCoords) new mapSdk.Marker({ position: locationCoords, content: '<span class="amap-user-dot"></span>', anchor: 'center' }).setMap(map);
    } catch { /* fallback map remains visible when the provider is unavailable */ }
  }
  function chooseMode(next: string) { if (recommendedOnly) recommendedRefined = true; mode = next; }
  function chooseCategory(next: string) { if (recommendedOnly) recommendedRefined = true; category = next; }
  function locate() {
    if (!navigator.geolocation) return notify('当前浏览器不支持定位');
    locationLabel = '正在获取当前位置…';
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const convert = (mapSdk as any)?.convertFrom;
      if (convert) {
        convert([coords.longitude, coords.latitude], 'gps', (status: string, result: any) => {
          if (status === 'complete' && result?.locations?.[0]) {
            locationCoords = [result.locations[0].lng, result.locations[0].lat];
            finishLocate();
          } else {
            locationCoords = [coords.longitude, coords.latitude];
            finishLocate();
          }
        });
      } else {
        locationCoords = [coords.longitude, coords.latitude];
        finishLocate();
      }
      function finishLocate() {
      const nearest = [...cityRows].sort((a, b) => distanceKm(locationCoords!, a.coords) - distanceKm(locationCoords!, b.coords))[0];
      const cityChanged = city.id !== nearest.id;
      city = nearest;
      locationLabel = `已定位 · ${city.name}`;
      if (cityChanged) load(); else renderMap();
      }
    }, () => { locationLabel = '定位权限被拒绝'; notify('请允许浏览器访问定位权限'); }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 });
  }
  $: shown = places.map((p) => ({ ...p, distance: p.coords ? distanceKm(origin(), p.coords) : Infinity, minutes: p.coords ? estimateMinutes(distanceKm(origin(), p.coords), mode) : null }))
    .filter((p) => p.minutes !== null && (recommendedOnly && !recommendedRefined ? true : p.minutes! <= timeLimit))
    .filter((p) => !recommendedOnly || p.recommended)
    .filter((p) => recommendedOnly && !recommendedRefined ? true : category === '全部' || p.type === category)
    .filter((p) => !query || `${p.name} ${p.type} ${p.area}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => recommendedOnly && !recommendedRefined ? a.minutes! - b.minutes! : a.distance! - b.distance!);
  $: loaded = shown.slice(0, visibleCount);
  async function openDetail(p: Place) { detail = p; gallery = 0; reviewText = ''; reviewRating = 5; reviewLoading = true; const placeCity = p.cityId || city.id; history.replaceState(null, '', `${BASE}/?place=${encodeURIComponent(p.id)}&city=${encodeURIComponent(placeCity)}`); try { const data: any = await api(`reviews?placeId=${encodeURIComponent(p.id)}&city=${placeCity}`); reviews = data.reviews || []; } catch { reviews = []; } finally { reviewLoading = false; } }
  function closeDetail() { detail = null; history.replaceState(null, '', `${BASE}/`); }
  function openZoom() { zoomOpen = true; zoomScale = 1; }
  function reviewFromFooter() {
    if (!authUser) { loginPrompt = true; return; }
    document.querySelector('.review-form textarea')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function formatReviewDate(value: number) {
    return new Date(value * 1000).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }
  function closeZoom() { zoomOpen = false; zoomScale = 1; }
  function zoomBy(delta: number) { zoomScale = Math.min(4, Math.max(1, Number((zoomScale + delta).toFixed(2)))); }
  function handleZoomWheel(event: WheelEvent) { event.preventDefault(); zoomBy(event.deltaY < 0 ? 0.25 : -0.25); }
  function blockImageAction(event: Event) { event.preventDefault(); }
  function navigationHref(place: Place) {
    if (!place.coords) return `https://uri.amap.com/search?keyword=${encodeURIComponent(place.name + ' ' + (place.address || ''))}`;
    const [lng, lat] = place.coords;
    return `https://uri.amap.com/navigation?to=${lng},${lat},${encodeURIComponent(place.name)}&mode=${mode === 'transit' ? 'bus' : mode}&policy=1&src=washjoy`;
  }
  function swipe(event: TouchEvent) { const delta = event.changedTouches[0].clientX - touchX; if (Math.abs(delta) > 45 && detail) gallery = (gallery + (delta < 0 ? 1 : detail.images.length - 1)) % detail.images.length; }
  function toggleFavorite(id: string) { favorites = favorites.includes(id) ? favorites.filter((x) => x !== id) : [...favorites, id]; localStorage.setItem('washjoy:favorites', JSON.stringify(favorites)); }
  async function submitReview(event: SubmitEvent) { event.preventDefault(); if (!detail || !reviewText.trim()) return; try { await api('reviews', { method: 'POST', body: JSON.stringify({ place_id: detail.id, city: city.id, rating: reviewRating, text: reviewText.trim() }) }); reviewText = ''; const data: any = await api(`reviews?placeId=${encodeURIComponent(detail.id)}&city=${city.id}`); reviews = data.reviews || []; notify('评价已发布'); } catch (e: any) { if (/登录|认证|401/.test(e.message)) loginPrompt = true; else notify(e.message); } }
  onMount(() => {
    try { favorites = JSON.parse(localStorage.getItem('washjoy:favorites') || '[]'); } catch {}
    const params = new URLSearchParams(location.search);
    const placeId = params.get('place');
    const requestedCity = cityRows.find((row) => row.id === params.get('city'));
    if (requestedCity) city = requestedCity;
    load().then(() => {
      if (placeId) {
        const place = places.find((row) => row.id === placeId);
        if (place) openDetail(place);
        else notify('这家门店暂时无法查看');
      }
    });
    const refresh = () => load();
    window.addEventListener('washjoy:data-updated', refresh);
    renderMap();
    return () => window.removeEventListener('washjoy:data-updated', refresh);
  });
</script>

<svelte:head><title>Washjoy · 附近好好洗</title><meta name="description" content="30 分钟内，找到适合你的洗浴、澡堂、足疗与私汤门店" /><link rel="icon" href={`${BASE}/favicon.svg`} /></svelte:head>

<div class="app-shell">
  <header class="topbar">
    <a class="brand" href={`${BASE}/`}><img class="brand-mark" src={`${BASE}/assets/washjoy-mark.svg`} alt=""/><span>Washjoy<small>附近好好洗</small></span></a>
    <button class="location" onclick={locate}><span class="live-dot"></span>{locationLabel}<ChevronRight size={14} /></button>
    <a class="login-link" href={`${BASE}/account`}>登录</a>
  </header>

  <main>
    <section class="intro"><div class="eyebrow"><span></span>此刻附近</div><h1>想洗个舒服澡？</h1><p>30 分钟内，找到适合你的那一间</p><img src={`${BASE}/assets/washjoy-hero-bathing-adults.webp`} alt="温泉池中放松戏水的成年女性" fetchpriority="high" /></section>
    <label class="search"><Search size={18} /><input bind:value={query} type="search" placeholder="搜店名、区域或想要的体验" aria-label="搜索附近门店" /></label>
    <div class="controls"><span><MapPin size={15} />{city.name}</span><button aria-expanded={filtersExpanded} onclick={() => filtersExpanded = !filtersExpanded}><SlidersHorizontal size={15}/>筛选 · {timeLimit}分钟<ChevronRight size={14}/></button></div>
    <div class="filters" class:expanded={filtersExpanded}>
      <div class="chips">{#each categories as c}<button class:active={category === c} onclick={() => chooseCategory(c)}>{c}</button>{/each}</div>
      <div class="segmented">{#each [['transit','公交地铁',TrainFront],['bike','骑行',Bike],['car','驾车',CarFront]] as item}{@const Icon = item[2]}<button class:active={mode === item[0]} onclick={() => chooseMode(item[0])}><Icon size={15}/>{item[1]}</button>{/each}</div>
      <div class="time-options">{#each [15,30,45,60] as t}<button class:active={timeLimit === t} onclick={() => timeLimit = t}><Clock3 size={14}/>{t === 60 ? '1 小时' : `${t} 分钟`}</button>{/each}</div>
    </div>
    <section class="map-preview" aria-label="门店位置地图"><div class="map-canvas" bind:this={mapNode}></div><div class="map-fallback" aria-hidden="true"><div class="map-river"></div><span class="map-street street-a"></span><span class="map-street street-b"></span><span class="map-street street-c"></span></div><button class="map-locate" onclick={locate} aria-label="重新定位"><LocateFixed size={18}/></button><span class="map-label"><span class="live-dot"></span>{city.name} · 已加载 {Math.min(loaded.length, 30)} 家</span></section>
    <section class="results-head"><div><h2>附近推荐</h2><span>{loaded.length} / {shown.length} 家已加载</span></div><button class:active={recommendedOnly} onclick={() => { recommendedOnly = !recommendedOnly; recommendedRefined = false; }}><Star size={15} fill={recommendedOnly ? 'currentColor' : 'none'} />站长推荐</button></section>
    <div class="rule">{recommendedOnly && !recommendedRefined ? '站长推荐 · 按当前交通工具到达时间排序' : `${mode === 'transit' ? '公交地铁' : mode === 'bike' ? '骑行' : '驾车'} · 预计 ${timeLimit === 60 ? '1 小时' : `${timeLimit} 分钟`} 内`}</div>
    {#if status === 'loading'}<div class="empty">正在加载附近门店…</div>{:else if status === 'error'}<div class="empty">门店数据暂时不可用，请稍后重试</div>{:else if !loaded.length}<div class="empty">没有找到符合条件的门店</div>{:else}<div class="place-list">{#each loaded as p (p.id)}<article class="place-card">
      <button class="place-photo" aria-label={`查看${p.name}详情`} onclick={() => openDetail(p)}><img src={p.images[0]} alt={p.name} loading="lazy" /><span>{p.generatedCover ? '分类示意图' : '门店图片'}</span></button>
      <div class="place-info"><div class="place-top"><div>{#if p.recommended}<b class="recommend-tag"><Star size={11} fill="currentColor"/>站长推荐</b>{/if}<small>{p.type} · {p.area}</small><h3><a href={`${BASE}/?place=${encodeURIComponent(p.id)}&city=${encodeURIComponent(city.id)}`} onclick={(e) => { e.preventDefault(); openDetail(p); }}>{p.name}</a></h3></div><button class="favorite" class:on={favorites.includes(p.id)} aria-label={favorites.includes(p.id) ? "取消收藏" : "收藏"} onclick={() => toggleFavorite(p.id)}><Heart size={18} fill={favorites.includes(p.id) ? 'currentColor' : 'none'} /></button></div><div class="rating"><Star size={13} fill="currentColor"/><b>{p.rating || '暂无评分'}</b><span>{p.reviews ? `${p.reviews} 条公开评价` : '暂无评价数据'}</span></div><div class="tags">{#each p.attrs as attr}<span>{attr}</span>{/each}</div><div class="place-bottom"><span>{p.price ? `¥${p.price} 起 / 人` : '价格请咨询门店'}</span><a class="nav-link" href={navigationHref(p)} target="_blank" rel="noopener" aria-label={`导航到${p.name}`}><b>{p.distance! < 1 ? `${Math.round(p.distance! * 1000)} 米` : `${p.distance!.toFixed(1)} 公里`} · {p.minutes} 分钟 <ChevronRight size={14}/></b></a></div></div>
    </article>{/each}{#if shown.length > visibleCount}<button class="load-more" onclick={() => visibleCount += 30}>继续加载更多门店</button>{/if}</div>{/if}
  </main>
  <nav class="bottom-nav"><a class="active" href={`${BASE}/`}><MapPin size={19}/><span>附近</span></a><a href={`${BASE}/mine?tab=favorites`}><Heart size={19}/><span>收藏</span></a><a href={`${BASE}/mine?tab=mine`}><UserRound size={19}/><span>我的</span></a></nav>
</div>

{#if detail}<div class="modal-backdrop" role="presentation" onclick={(e) => e.currentTarget === e.target && closeDetail()}><section class="detail-modal" role="dialog" aria-modal="true" tabindex="-1"><div class="detail-cover" role="group" aria-label="门店照片，可左右滑动" ontouchstart={(e) => touchX = e.touches[0].clientX} ontouchend={swipe}><button class="zoom-trigger" aria-label="放大图片" onclick={openZoom}><img src={detail.images[gallery] || spaImage} alt={detail.name} draggable="false" oncontextmenu={blockImageAction} ondragstart={blockImageAction} /></button><button class="close" aria-label="关闭" onclick={closeDetail}><X size={20}/></button><span>{gallery + 1} / {detail.images.length} · 点击放大</span></div><div class="detail-body"><small>{detail.type} · {detail.area}</small><h2>{detail.name}</h2><p><MapPin size={14}/>{detail.address || '暂无详细地址'}</p><div class="facts"><a class="eta-link" href={navigationHref(detail)} target="_blank" rel="noopener"><Clock3 size={15}/><b>{detail.minutes} 分钟可达</b></a><b>{detail.price ? `¥${detail.price} 起` : '价格待咨询'}</b><b>{detail.hours || '营业时间待补充'}</b></div>{#if detail.description}<section class="official-intro"><div><h3>门店介绍</h3><small>{detail.adminUpdatedAt ? `管理员更新 · ${formatReviewDate(detail.adminUpdatedAt)}` : '管理员维护'}</small></div><p>{detail.description}</p></section>{/if}<h3>服务特色</h3><div class="tags">{#each detail.features as feature}<span>{feature}</span>{/each}</div><h3>公开评价 {reviews.length ? `(${reviews.length})` : ''}</h3>{#if reviewLoading}<p class="hint">正在加载评价…</p>{:else if reviews.length}{#each reviews as review}<article class="review-item"><div class="review-meta"><b>{review.author || 'Washjoy 用户'} · {'★'.repeat(review.rating || 5)}</b><time datetime={new Date(review.created * 1000).toISOString()}>{formatReviewDate(review.created)}</time></div><p>{review.text}</p></article>{/each}{:else}<p class="hint">暂无公开评价，来写第一条。</p>{/if}{#if authUser}<form class="review-form" onsubmit={submitReview}><div class="review-stars">{#each [1,2,3,4,5] as star}<button type="button" class:active={reviewRating >= star} onclick={() => reviewRating = star}>★</button>{/each}</div><textarea bind:value={reviewText} required maxlength="500" placeholder="分享你的真实体验"></textarea><button class="review-button" type="submit">发布评价</button></form>{/if}</div><footer class="detail-footer"><button class="detail-review-cta" onclick={reviewFromFooter}><MessageSquareText size={16}/>{authUser ? '写评价' : '登录评价'}</button><a class="navigate-button" href={navigationHref(detail)} target="_blank" rel="noopener"><MapPin size={16}/>开始导航</a></footer></section></div>{/if}
{#if zoomOpen && detail}<div class="image-zoom" role="dialog" aria-modal="true" aria-label="大图预览" tabindex="-1" onclick={(e) => e.currentTarget === e.target && closeZoom()} onkeydown={(e) => e.key === 'Escape' && closeZoom()} onwheel={handleZoomWheel}><div class="zoom-toolbar"><button aria-label="缩小" onclick={() => zoomBy(-0.25)}>−</button><span>{Math.round(zoomScale * 100)}%</span><button aria-label="放大" onclick={() => zoomBy(0.25)}>+</button><button aria-label="关闭大图" onclick={closeZoom}><X size={20}/></button></div><img src={detail.images[gallery] || spaImage} alt={detail.name} draggable="false" oncontextmenu={blockImageAction} ondragstart={blockImageAction} style={`transform:scale(${zoomScale})`} /></div>{/if}
{#if loginPrompt}<div class="modal-backdrop" role="presentation" onclick={(e) => e.currentTarget === e.target && (loginPrompt = false)}><section class="prompt" role="dialog"><h2>登录后写评价</h2><p>登录后才能发布评价，评价会同步保存到账号和门店后台。</p><div><button onclick={() => loginPrompt = false}>稍后再说</button><a href={`${BASE}/account`}>去登录<ChevronRight size={16}/></a></div></section></div>{/if}
{#if toast}<div class="toast">{toast}</div>{/if}
