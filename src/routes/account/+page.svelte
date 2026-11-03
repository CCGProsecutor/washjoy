<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowLeft, Check, ChevronRight, Lock, LogOut, Phone, ShieldCheck, UserRound } from 'lucide-svelte';
  import { api, BASE } from '#lib/api';

  let user: any = null;
  let mode = 'login';
  let form = { phone: '', password: '', display_name: '' };
  let name = '';
  let error = '';
  let busy = false;
  let toast = '';
  const notify = (message: string) => { toast = message; setTimeout(() => toast = '', 2400); };
  onMount(async () => { try { user = await api('auth/me'); name = user.profile?.displayName || ''; } catch {} });
  async function submit(event: SubmitEvent) {
    event.preventDefault(); error = ''; busy = true;
    try { const data: any = await api(`auth/${mode}`, { method: 'POST', body: JSON.stringify(form) }); user = data.user; name = user.profile?.displayName || ''; form = { phone: '', password: '', display_name: '' }; notify(mode === 'register' ? '注册成功，欢迎加入' : '登录成功'); }
    catch (e: any) { error = e.message; } finally { busy = false; }
  }
  async function saveProfile(event: SubmitEvent) { event.preventDefault(); try { const data: any = await api('auth/profile', { method: 'PUT', body: JSON.stringify({ display_name: name }) }); user = { ...user, ...data }; notify('资料已保存'); } catch (e: any) { notify(e.message); } }
  async function logout() { await api('auth/logout', { method: 'POST' }).catch(() => {}); user = null; mode = 'login'; notify('已退出登录'); }
</script>

<svelte:head><title>{user ? '我的账号' : '登录 / 注册'} · Washjoy</title></svelte:head>
<div class="account-page"><header class="account-bar"><a href={`${BASE}/`} aria-label="返回首页"><ArrowLeft size={19}/></a><b>{user ? '我的账号' : '登录 / 注册'}</b><span></span></header>
  <main class="account-card">
    {#if user}
      <div class="profile-head"><span class="avatar">{(user.profile?.displayName || user.phone || 'W').slice(0,1)}</span><div><h1>{user.profile?.displayName || 'Washjoy 用户'}</h1><p>{user.role === 'admin' ? '管理员' : '已注册用户'} · {user.phone}</p></div></div>
      <form class="account-form" onsubmit={saveProfile}><label><UserRound size={17}/><input bind:value={name} placeholder="设置昵称" /></label><button class="primary">保存资料</button></form>
      <div class="account-links">{#if user.role === 'admin'}<a href={`${BASE}/admin`}><ShieldCheck size={17}/>门店管理后台<ChevronRight size={16}/></a>{/if}<a href={`${BASE}/`}><UserRound size={17}/>发现附近好店<ChevronRight size={16}/></a><button onclick={logout}><LogOut size={17}/>退出登录<ChevronRight size={16}/></button></div>
    {:else}
      <div class="account-intro"><img class="brand-mark" src={`${BASE}/assets/washjoy-mark.svg`} alt=""/><h1>{mode === 'register' ? '创建账号' : '欢迎回来'}</h1><p>{mode === 'register' ? '注册后可保存资料与提交记录' : '用手机号登录，继续你的发现'}</p></div>
      <div class="account-segment"><button class:active={mode === 'login'} onclick={() => { mode = 'login'; error = ''; }}>登录</button><button class:active={mode === 'register'} onclick={() => { mode = 'register'; error = ''; }}>注册</button></div>
      <form class="account-form" onsubmit={submit}><label><Phone size={17}/><input required inputmode="tel" autocomplete="username" placeholder="中国大陆手机号" bind:value={form.phone}/></label><label><Lock size={17}/><input required type="password" autocomplete={mode === 'register' ? 'new-password' : 'current-password'} placeholder={mode === 'register' ? '密码至少 10 位' : '密码'} bind:value={form.password}/></label>{#if mode === 'register'}<label><UserRound size={17}/><input placeholder="昵称（选填）" bind:value={form.display_name}/></label>{/if}<button class="primary" disabled={busy}>{busy ? '处理中…' : mode === 'register' ? '创建账号' : '登录'}</button>{#if error}<p class="error">{error}</p>{/if}</form>
      <p class="account-note">{mode === 'register' ? '同一来源 IP 每 30 秒只能注册一次，请勿重复提交。' : '登录状态会保留，方便下次直接使用。'}</p>
    {/if}
  </main>
</div>
{#if toast}<div class="toast"><Check size={15}/>{toast}</div>{/if}
