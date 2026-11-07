export function handleError({ error, event }: { error: unknown; event: { url: URL } }) {
  if (event.url.pathname.startsWith('/washjoy/')) return;
  console.error(error);
}
