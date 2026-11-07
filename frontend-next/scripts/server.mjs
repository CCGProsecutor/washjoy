import express from 'express'
import { createRequestHandler } from '@react-router/express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const port = Number(process.env.PORT || 3780)
const host = process.env.HOST || '127.0.0.1'

app.use('/washjoy/api', createProxyMiddleware({ target: 'http://127.0.0.1:3775', changeOrigin: true, pathRewrite: { '^/washjoy/api': '' } }))
app.use('/washjoy', express.static(path.resolve(root, '../build/client'), { index: false }))
const build = await import('../build/server/index.js')
app.all('*', createRequestHandler({ build, mode: 'production' }))
app.listen(port, host, () => console.log(`Washjoy React Router listening on http://${host}:${port}`))
