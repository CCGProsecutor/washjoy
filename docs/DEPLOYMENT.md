# Washjoy架构与部署

目标与门禁以 PLAN.md、TASKS.md、ACCEPTANCE.md 和共享 TECH/UI 为准。旧实现仅用于迁移比对和回滚，不继承旧框架部署步骤。

实施时记录实际 systemd unit、loopback 端口、Angie 路径、产物 SHA/校验值、受保护配置路径、PostgreSQL 备份/恢复和回滚命令；未实测项不得写成完成。


## 2026-11-07：B 温润旅居前端版本

本会话已明确授权重构、测试、上线；随后用户选定 B 视觉。本次只发布前端，不改 Rust 二进制、API、账户或 PostgreSQL 数据。

- 生产入口 `https://fehd.top/washjoy/`；原 Angie 路由不变，前端 `127.0.0.1:3780`、API `127.0.0.1:3775`。
- unit `washjoy-next.service`，工作目录 `/opt/apps/washjoy-frontend/current`，启动 `/usr/local/bin/bun run preview`。保留原隔离配置，移除旧工作区 build 的写权限。
- current 指向 `/opt/apps/washjoy-frontend/releases/b-warm-20261107-191109`；previous 可启动版本 `/opt/apps/washjoy-frontend/releases/b-warm-20261107-191109-previous`。运行依赖、SSR脚本独立随版本保存，不链接开发工作区。
- SSR SHA256 `7dedd08049ad89147415064b4bb2b837b7f9698b8a7b74090c41ec939a5f14b1`；构建文件清单 `/opt/apps/washjoy-frontend/releases/b-warm-20261107-191109/SHA256SUMS` 已逐项验证。客户端保留上个版本的 hash 资源。
- 原 PWA alias 文件路径不变，通过 current 指针读取 manifest/sw；新 SW `washjoy-warm-directory-v1` 只缓存 hash 静态资源，HTML、账户、API不进入离线缓存。

### 备份与回切

受限备份 `/root/backups/washjoy-frontend/b-warm-20261107-191109` 含原 unit、Angie配置、PWA静态目录和前端环境，目录0700、环境0600；不上传公开产物库。旧版本已在独立3793端口启动并校验首页200、14个JS/CSS 200及MIME，进程已停止。

回切命令：`python3 /root/scratch/washjoy-b-verify/deploy_frontend.py --rollback`。其动作是创建指向 previous 的临时符号链接，以 `os.replace` 原子替换 current，重启前端并验证首页；PWA别名跟随同一指针。此操作不恢复或覆盖数据库。

若需恢复原 unit，文件在 `/root/backups/washjoy-frontend/b-warm-20261107-191109/washjoy-next.service`；恢复到 `/etc/systemd/system/washjoy-next.service` 后执行 `systemctl daemon-reload`、重启前端，原工作区旧 build 保留。

### 验证与观察

正式产物在 `/root/scratch/washjoy-b-release-build/frontend-next` 独立构建，原受保护构建环境仅复制不输出。冻结依赖安装、类型、严格lint、6个单测、正式构建通过；48项B回归、9项账户/收藏/后台受影响回归、8项截图检查通过。

真实SDK检查发现地图销毁时的 `getOptions` 异常，修为切换时保留地图实例，并将视野设置为即时完成；真实高德SDK反复切换、离开页面与真实图片读取检查通过。模拟测试不作为真实提供商证据。

上线事务已验证4个公网入口200、14个JS/CSS资源200与MIME、PWA别名内容和产物一致、API health 200。证据目录 `/root/scratch/washjoy-b-verify/`：`release-metadata.json`、`deployment.json`、`release-regression.log`、`account-regression.log`、`visual-release.log`、`real-smoke.json`、`observation-summary.json`。

观察基线10次首页请求0错误，中位0.1488秒、最大0.2159秒。发布后窗口>=120秒、>=20组首页+health请求，记录重启、内存、延迟。任一关键页面/资源/health错误、非预期重启、持续内存>300MiB或p95>2秒停止并回切。公网真实浏览器和完整观察结果待完成后追加；这次发布不证明旧后端迁移/PG恢复门禁完成。


### 最终公网与观察结论

公网真实SDK/真实API只读浏览器检查通过：30张门店卡、首图成功、7个地图脚本200、0未处理异常，反复切换和离开页面正常。发布后观察127.3秒、40次首页/health请求，0错误/0非预期重启；最高内存202.9MiB，组合p95 0.5117秒。均未触及回切门槛。

## 2026-11-07：详情页介绍/服务标签与图标修复

- current：`/opt/apps/washjoy-frontend/releases/b-detail-20261107-2017`
- 回退基线（仅前端）：`/opt/apps/washjoy-frontend/releases/b-annotations-20261107-115045`
- 发布元数据及受限配置备份：`/root/backups/washjoy-frontend/b-detail-20261107-2017`
- SSR SHA256：`981efd8f97fc918f12e2edd9e302aa27d26a3315d8fedcc5e6e4270c62176648`
- unit/端口/API/Angie配置沿用现状，没有后端和数据库变更。新release独立依赖，保留上一版本的hash资源，PWA静态链接继续跟随current。发布检查13个build资源及首页/health/sw/manifest均HTTP200，真实地图/图片smoke无未处理异常。
- 最终验收：23项单测、32项相关浏览器回归，typecheck/lint/独立生产build通过。观察结果见 `docs/STATUS.md`。

回退时先确认current仍为本版本，再原子切回以上基线并 `systemctl restart washjoy-next.service`；验证首页、API health和旧版关键资源HTTP200。不覆盖数据或受保护配置。

## 2026-11-07：账户按钮与路线增量读取

- current：`/opt/apps/washjoy-frontend/releases/b-routing-safe-20261107-235255`；回退基线：`b-detail-20261107-2017`。
- SSR SHA256：`a45f024db2afa9eb57fc3a43dc0a8f507898ce004948f0dfed48a4a22b32e6c9`；发布文件清单在 release 的 `SHA256SUMS`；备份 `/root/backups/washjoy-frontend/b-routing-safe-20261107-235255`。运行依赖独立随版本保存。误含动效候选的 `b-routing-20261107-230757` 仅作隔离产物，不是 current。
- 代码修复账户按钮固有宽度覆盖、默认出行方式改为驾车，并让路线继续查找只计算新增候选；当前批次候选数与实际符合门店数分开显示。
- 独立生产构建及 `3795` 本机四入口/API smoke 通过；`390px` 首页专项 5/5、账户提交专项 2/2 通过；typecheck、lint、23 项单测通过。
- 原子切换后 `washjoy-next.service` active；公网首页、账户页、health 均 HTTP 200。发布后约 124.8 秒、30 轮首页/health：0 错误、0 非预期重启，组合 P95 208.4ms，最大 225.3ms。
- 本次未发布动效候选，因其 CPU4x 帧率性能门禁仍未通过；未改 Rust/API/认证权限/数据库。
