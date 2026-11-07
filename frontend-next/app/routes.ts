import { type RouteConfig, index, route } from '@react-router/dev/routes'

export default [
  index('../src/routes/index.tsx'),
  route('account', '../src/routes/account.tsx'),
  route('mine', '../src/routes/mine.tsx'),
  route('admin', '../src/routes/admin.tsx'),
] satisfies RouteConfig
