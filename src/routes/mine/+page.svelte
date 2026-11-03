<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowLeft, ChevronRight, Heart, MapPin, Star, UserRound } from 'lucide-svelte';
  import { api, BASE, cityRows, normalizePlace } from '#lib/api';

  let tab = 'favorites';
  let user: any = null;
  let favorites: string[] = [];
  let places: any[] = [];
  let reviews: any[] = [];
  let loading = true;
  onMount(async () => {
    tab = new URLSearchParams(location.search).get('tab') === 'mine' ? 'mine' : 'favorites';
    try { favorites = JSON.parse(localStorage.getItem('washjoy:favorites') || '[]'); } catch {}
    api('auth/me').then((u) => user = u).catch(() => {});
    if (!favorites.length) { loading = false; return; }
    try {
      const datasets = await Promise.all(cityRows.map(async (city) => {
        const data: any = await api(`public-data?city=${city.id}`);
        return (data.pois || []).map((p: any, i: number) => ({ ...normalizePlace(p, city.name, i), cityId: city.id }));
      }));
      places = datasets.flat().filter((p) => favorites.includes(p.id));
    } finally { loading = false; }
  });
  async function showReviews() {
    tab = 'reviews';
    if (user && !reviews.length) try { const data: any = await api('reviews/mine'); reviews = data.reviews || []; } catch {}
  }
</script>

<svelte:head><title>我的 · Washjoy</title></svelte:head>
<main class="mine-page">
  <header class="mine-header"><a href={`${BASE}/`} aria-label="返回首页"><ArrowLeft size={20}/></a><h1>我的</h1><a href={`${BASE}/account`} aria-label="账号设置"><UserRound size={20}/></a></header>
  <a class="mine-profile" href={`${BASE}/account`}><span class="mine-avatar">{user?.profile?.displayName?.slice(0,1) || 'W'}</span><span><b>{user?.profile?.displayName || '登录 / 注册'}<ChevronRight size={17}/></b><small>{user ? '探索更好的洗浴体验' : '登录后同步收藏与评价'}</small></span></a>
  <div class="mine-tabs"><button class:active={tab === 'favorites'} onclick={() => tab = 'favorites'}>我的收藏</button><button class:active={tab === 'reviews'} onclick={showReviews}>我的评价</button><button class:active={tab === 'submissions'} onclick={() => tab = 'submissions'}>我的提交</button></div>
  {#if tab === 'favorites'}
    {#if loading}<p class="mine-empty">正在读取收藏…</p>{:else if !places.length}<div class="mine-empty"><Heart size={26}/><b>还没有收藏门店</b><a href={`${BASE}/`}>去附近发现好店<ChevronRight size={15}/></a></div>{:else}<div class="mine-list">{#each places as place (place.id)}<article class="mine-card"><img src={place.images[0]} alt="" loading="lazy"/><div><h2>{place.name}</h2><p class="mine-rating"><Star size={14} fill="currentColor"/>{place.rating || '暂无评分'}　{place.attrs.slice(0,2).join(' · ')}</p><p class="mine-address"><MapPin size={13}/>{place.area}　{place.address}</p></div><a href={`${BASE}/?place=${encodeURIComponent(place.id)}&city=${encodeURIComponent(place.cityId)}`} aria-label={`查看${place.name}详情`}><ChevronRight size={18}/></a></article>{/each}</div>{/if}
  {:else if tab === 'reviews'}
    {#if !user}<div class="mine-empty"><UserRound size={26}/><b>登录后查看评价</b><a href={`${BASE}/account`}>去登录<ChevronRight size={15}/></a></div>{:else if !reviews.length}<div class="mine-empty"><Star size={26}/><b>还没有发布评价</b><a href={`${BASE}/`}>去门店详情写评价<ChevronRight size={15}/></a></div>{:else}<div class="mine-list">{#each reviews as review}<article class="mine-review"><b>{review.place_name || '门店评价'}　<span>{'★'.repeat(review.rating || 5)}</span></b><p>{review.text}</p><small>{new Date(review.created * 1000).toLocaleDateString('zh-CN')}</small></article>{/each}</div>{/if}
  {:else if tab === 'submissions'}<div class="mine-empty"><b>门店资料提交</b><p>目前请联系 Washjoy 团队提交或更正门店资料。</p><a href="mailto:hello@fehd.top">联系团队<ChevronRight size={15}/></a></div>
  {:else}<div class="mine-menu"><a href={`${BASE}/mine?tab=favorites`}><Heart size={18}/>我的收藏<ChevronRight size={16}/></a><a href={`${BASE}/account`}><UserRound size={18}/>账号资料<ChevronRight size={16}/></a><a href={`${BASE}/mine?tab=submissions`}>门店资料提交<ChevronRight size={16}/></a></div>{/if}
  <nav class="bottom-nav"><a href={`${BASE}/`}><MapPin size={19}/><span>附近</span></a><a class:active={tab === 'favorites'} href={`${BASE}/mine?tab=favorites`}><Heart size={19}/><span>收藏</span></a><a class:active={tab === 'mine'} href={`${BASE}/mine?tab=mine`}><UserRound size={19}/><span>我的</span></a></nav>
</main>
