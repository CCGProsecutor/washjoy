import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { Providers } from '../providers'

import appCss from '../styles.css?url'
import interFont from '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content',
      },
      {
        title: 'Washjoy · 附近体验',
      },
      { name: 'theme-color', content: '#f2f5f3' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      { name: 'description', content: '发现附近的洗浴、足疗与私汤体验。' },
    ],
    links: [
      { rel: 'preload', href: interFont, as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: appCss,
      },
      { rel: 'manifest', href: '/washjoy/manifest.webmanifest' },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } }))
  return (
    <html lang="zh-CN">
      <head>
        <HeadContent />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <Providers>
            {children}
          </Providers>
          {import.meta.env.DEV && <TanStackDevtools config={{ position: 'bottom-right' }} plugins={[{ name: 'Tanstack Router', render: <TanStackRouterDevtoolsPanel /> }]} />}
        </QueryClientProvider>
        <script dangerouslySetInnerHTML={{ __html: `if ('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('/washjoy/sw.js',{scope:'/washjoy/'}).catch(()=>{}));` }} />
        <Scripts />
      </body>
    </html>
  )
}
