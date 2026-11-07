<script lang="ts">
  import { onMount } from 'svelte';
  import '../styles.css';
  let { children } = $props();

  onMount(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
        scope: import.meta.env.BASE_URL,
      }).catch(() => {});
    }
  });
</script>

<svelte:head>
  <link rel="manifest" href={`${import.meta.env.BASE_URL}manifest.webmanifest`} />
  <link rel="apple-touch-icon" href={`${import.meta.env.BASE_URL}assets/washjoy-app-icon-180.png`} />
</svelte:head>

{@render children()}
