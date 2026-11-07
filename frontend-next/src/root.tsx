import './styles.css'
import type { ReactNode } from 'react'
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Providers } from './providers'
import { MotionFeedback } from './components/motion-feedback'

export function Layout({ children }: { children: ReactNode }) {
  return <html lang="zh-CN"><head><meta charSet="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content" /><meta name="theme-color" content="#f6f4ef" media="(prefers-color-scheme: light)" /><meta name="theme-color" content="#1b1e1a" media="(prefers-color-scheme: dark)" /><meta name="apple-mobile-web-app-capable" content="yes" /><meta name="description" content="发现附近的洗浴、足疗与私汤体验。" /><link rel="manifest" href="/washjoy/manifest.webmanifest" /><title>Washjoy · 附近好去处</title><Meta /><Links /></head><body>{children}<ScrollRestoration /><Scripts /></body></html>
}

export default function App() {
  useEffect(() => {
    if ('serviceWorker' in navigator) void navigator.serviceWorker.register('/washjoy/sw.js', { scope: '/washjoy/', updateViaCache: 'none' }).catch(() => undefined)
  }, [])
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } }))
  return <QueryClientProvider client={queryClient}><Providers><MotionFeedback /><Outlet /></Providers></QueryClientProvider>
}
