# Washjoy 服务端与部署说明

## 运行组件
| 组件 | 位置 | 端口 | 服务 |
| --- | --- | --- | --- |
| Rust API（axum + rusqlite） | `server/src/main.rs` | 127.0.0.1:3775 | `washjoy-rust-api.service` |
| Next.js 前端（React 19） | `app/` + `src/main.jsx` | 127.0.0.1:3000 | `washjoy-next.service` |
| 反向代理 | `/etc/angie/http.d/fehd.top.conf` | 443 | `angie` |

线上入口：`https://fehd.top/washjoy/`、`/washjoy/account`、`/washjoy/admin`。

## 环境变量（`/etc/washjoy.env`，权限 0600）
- `WASHJOY_ADMIN_PHONE` / `WASHJOY_ADMIN_PASSWORD`：首次启动写入管理员账号（scrypt 哈希入库）
- `WASHJOY_DATA_DIR`：SQLite 与私有数据目录（默认 `/var/www/html/washjoy/private`，目录 0700）
- `WASHJOY_UPLOAD_DIR`：图片本地备份目录（`/var/www/html/washjoy/uploads`，随站点进入加密 GitHub 备份）
- `WASHJOY_OSS_BUCKET` / `WASHJOY_OSS_PREFIX` / `WASHJOY_OSS_BASE`：OSS 加速地址配置

## 数据模型
- `users`：手机号、scrypt 口令哈希、角色、资料 JSON、注册时间
- `sessions`：仅保存会话令牌的 SHA-256，Cookie 为 HttpOnly + Secure + SameSite=Strict，12 小时有效
- `reg_limit`：按来源 IP 记录最后注册时间，强制 30 秒间隔（HTTP 429）
- `login_fail`：按 IP+手机号累计失败次数，8 次后锁定 15 分钟
- `store_overrides`：人工覆盖层；`manual=1` 为站长新增门店，`deleted=1` 为下架
  - 高德原始 JSON 始终只读，接口在读取时与覆盖层合并，刷新高德数据不会覆盖人工内容

## 接口
公开：`GET /api/health`、`GET /api/public-data?city=nanjing|yangzhou|zhenjiang`、`GET /api/reviews?placeId=`

评价（登录用户）：`POST /api/reviews`、`GET /api/reviews/mine`

评价管理（admin）：`GET /api/admin/reviews?city=&placeId=`、`DELETE /api/admin/reviews/{id}`；门店详情中的“门店介绍”取自 `store_overrides`/手工门店 JSON 的 `description` 字段。
账号：`POST /api/auth/register`、`POST /api/auth/login`、`GET /api/auth/me`、`PUT /api/auth/profile`、`POST /api/auth/logout`
管理员（需 admin 会话）：`GET/POST /api/admin/places`、`PUT/DELETE /api/admin/places/{id}`、`POST /api/admin/places/{id}/restore`、`GET /api/admin/trash`、`DELETE /api/admin/trash/{id}`、`GET /api/admin/tags`、`POST /api/admin/upload`

门店删除为软删除（`store_overrides.deleted=1`），前台与后台列表立即不可见，可在回收站恢复；手工门店可从回收站彻底删除，高德门店只能隐藏或恢复。`admin/tags` 汇总历史“服务和设施”标签，供后台复用。

## 构建与发布
```bash
cd /root/.t3/projects/washjoy/server && cargo build --release
cd /root/.t3/projects/washjoy && npm run build
systemctl restart washjoy-rust-api washjoy-next
angie -t && systemctl reload angie
```

## 回滚
旧 Node 实现保留在 `server/server.js`，旧静态站点文件仍在 `/var/www/html/washjoy/`。
1. 将 `/etc/angie/http.d/fehd.top.conf` 中 `/washjoy/` 的 `proxy_pass http://127.0.0.1:3000` 改为 `try_files`（静态站）或删除该 location；
2. 如需旧接口，`systemctl enable --now washjoy-api` 并把 `/washjoy/api/` 代理改回 `127.0.0.1:3774`；
3. `angie -t && systemctl reload angie`。
