# Washjoy 服务端与部署说明

## 运行组件
| 组件 | 位置 | 端口 | 服务 |
| --- | --- | --- | --- |
| Rust API（Axum + SQLx/PostgreSQL） | `server/src/main.rs` | 127.0.0.1:3775 | `washjoy-rust-api.service` |
| React 19 + React Router Framework Mode 前端 | `frontend-next/` | 127.0.0.1:3780 | `washjoy-next.service` |
| 反向代理 | `/etc/angie/http.d/fehd.top.conf` | 443 | `angie` |

线上入口：`https://fehd.top/washjoy/`、`/washjoy/account`、`/washjoy/admin`。

## 环境变量（权限 0600）
- `/etc/washjoy-postgres.env`：`DATABASE_URL`，运行时唯一数据库连接；服务启动会执行 SQLx migration。
- `/etc/washjoy.env`：`WASHJOY_ADMIN_PHONE` 保留注册流程的既有管理员号码规则。管理员账户必须已存在于 PostgreSQL，启动时不会创建默认凭据。
- `WASHJOY_UPLOAD_DIR`：图片本地备份目录（`/var/www/html/washjoy/uploads`，随站点进入加密 GitHub 备份）
- `WASHJOY_OSS_BUCKET` / `WASHJOY_OSS_PREFIX` / `WASHJOY_OSS_BASE`：OSS 加速地址配置

SQLite 只供 `src/bin/import_sqlite.rs` 将旧库迁入 PostgreSQL，不参与线上读写或备份。

## 备份与恢复

线上写入已经落在 PostgreSQL。发布前须用数据库管理流程生成一致性 PostgreSQL 备份，并在独立数据库完成恢复验证；不要将旧 SQLite 快照视为 PostgreSQL 回滚材料。图片引用与上传目录需要与数据库备份一并核验。本说明不代表已执行备份或恢复。

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

## 构建、发布与回滚

发布流程、独立 release 切换、服务二进制路径、PostgreSQL 恢复验证和回滚证据由 [`docs/DEPLOYMENT.md`](../docs/DEPLOYMENT.md) 维护。不要以工作区 `cargo build` 后直接重启服务替代 release 发布；线上服务使用的二进制必须是经校验的 release 产物。旧静态站点和 SQLite 不能作为 PostgreSQL 数据回滚方案。
