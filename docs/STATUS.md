# Washjoy 状态

更新：2026-11-07。本文件以本轮代码与运行检查为准；旧完成报告、早期勾选不代表当前发布门禁已通过。

## 已核实

- 2026-11-07 账户与路线小修已发布：current 为 `/opt/apps/washjoy-frontend/releases/b-routing-safe-20261107-235255`，SSR SHA256 `a45f024db2afa9eb57fc3a43dc0a8f507898ce004948f0dfed48a4a22b32e6c9`；该产物从动效候选之前的稳定源码快照构建，仅包含账户按钮整宽与路线增量批次修复。
- 线上 `390px` 账户页按钮实测 `362×48px`；首页首批30家后继续查找只发起新增4次路线请求。发布后观察124.8秒、30轮首页/health，0错误、0非预期重启，组合P95 208.4ms，最大225.3ms。

- 生产前端是 React Router SSR，服务 washjoy-next.service，127.0.0.1:3780。
- 生产 Rust API 为 washjoy-rust-api.service，127.0.0.1:3775，已实际接入 PostgreSQL；公开数据、认证、门店维护等主路径使用 SQLx。
- 12:30 恢复前端运行时旧资源错配；重启后本机与 https://fehd.top/washjoy/ 所引用的 14 个 JS/CSS 全部为 HTTP 200、正确 MIME。
- HeroUI v3 已安装；线上旧 UI 仍有 Base UI 与 HeroUI v2，尚未完成组件统一。
- 本轮修复高德类型与 React effect 依赖后，前端 typecheck、严格 lint 已通过。

## 执行中

- HeroUI 苹果风格 UI Playground，独立目录 /root/scratch/washjoy-ui-review 构建与验证，不覆盖生产产物。
- 后端清理残余 SQLite 初始化及假快照、兼容错误契约与回归测试。
- 构建脚本规范为 react-router build/typegen，避免直接 vite build 导致服务端与客户端产物不一致。

## 尚未完成

- 核心视觉样板的用户确认与全站业务 UI 应用。
- 确定性全量 E2E；旧 scheme-b 测试存在条件不满足时不验证的分支，不视为覆盖证据。
- 真实外部地图/图片服务验证、独立 PG 的 API 写入与导入幂等回归。
- PG 备份恢复实测、完整 release 备份/切换/回滚验证及最终生产发布。

本轮账户按钮与路线增量小修已发布并完成观察；全站动效候选因 CPU4x 帧率门禁未通过仍不发布。其余全站重构与后端事项按下方状态继续推进。


## 2026-11-07 最新用户指示：先视觉探索

用户反馈此前界面缺乏质感，并显式调用 solo-coding 要求给出选择方向、可以先出视觉稿。当前阶段仅生成并比较三张手机首页概念图（原生地图、温润旅居、夜间探索），不继续旧的上线任务，不修改业务实现、依赖或运行服务。候选不是已确认目标，示例地图、门店图与评分不代表生产数据。

本轮范围与检查见 `/root/scratch/washjoy-visual-options-20261107/`，生成图片与提示词位于 `/root/output/imagegen/washjoy-direction-*-20261107.*`。既有上线记录尚有冲突，本阶段不据旧状态宣称当前全站已完成验收。


### 本轮视觉交付

已生成并逐张查看 A 原生地图 / B 温润旅居 / C 夜间探索，实际尺寸均为 941×1672 PNG；使用注册图像工具自动路由 gpt-image-2.6-sunburst，3次生成均成功，无额外重绘。已校验 PNG 可解码、尺寸、SHA256，三张图片均通过 artifact-vault 备份到公开 OSS，并 HEAD 校验远端字节与本地一致。

交互比较页已成功 html_preview（390px、contentHeight 980、无控制台信息）后 html_render；支持切换单稿和并排比较。导出路径 `/root/scratch/washjoy-visual-options-20261107/visual-options.html`；源图 `/root/output/imagegen/washjoy-direction-{A-native-map,B-warm-directory,C-night-explorer}-20261107.png`。导出页引用已备份的OSS原图；首次内嵌Base64导出被上传工具凭据模式扫描拦截，核查4个匹配均在图像Base64内、文本零匹配，改用已备份图片URL后重新正常提交，不修改上传检查规则。

主代理推荐 B；候选尚未获用户选择。本阶段未修改界面业务实现或部署，无新增功能测试/上线通过声明。下一步等用户选方向，再以选定稿为视觉目标制作真实HeroUI界面样板，保留既有地图、筛选、详情、收藏与账户能力。


## 2026-11-07 B 温润旅居：前端已上线并验证

用户选定 B 后已完成图片目录首页、显式地图切换、HeroUI筛选弹窗、详情/收藏/账户暖白橄榄主题。所有原分类、推荐、半径、驾车时间、出行偏好、30条追加分页、详情/图片/收藏/账户能力保留；真实数据不以生成内景替代。

### 实际结果

- 正式版本 `b-warm-20261107-191109`；`washjoy-next.service` 工作目录 `/opt/apps/washjoy-frontend/current`。原 SSR/API 端口与 Angie 代理路由不变；Rust二进制/数据库/账户数据未改。
- 当前产物以本文件顶部最新发布记录为准：`/opt/apps/washjoy-frontend/releases/b-routing-safe-20261107-235255`；回切路径/命令见 DEPLOYMENT.md。
- 冻结安装、类型检查、严格lint、正式构建通过；6个逻辑单测、48项B界面回归、9项受影响账户/收藏隔离/后台失败保留回归、8项截图检查通过。旧套件中针对旧DOM的页面断言没有被当成本轮通过证据；不宣称旧后端迁移/PG恢复因本次而完成。
- 真实SDK检查发现从地图返回列表时的 `getOptions` 错误；现在首次进入才创建地图、视图切换保留实例、视野设置即时完成，离开页面释放。真实高德SDK反复切换/离开页面与真实图片加载检查通过，未吞掉SDK错误。已补地图实例保留与地图剩余分页回归。
- 公网四入口全部200，全部14个HTML引用JS/CSS 200且MIME正确；SW/manifest与版本一致。
- 公网浏览器未mock SDK/API，固定南京验证坐标；首图加载成功、显示30张门店卡，7个实际地图脚本200、未处理异常0。地图道路/标记实际可见；模拟fixture回归与此提供商验证分开记录。
- 发布后观察127.3秒、40次首页/health请求：0 HTTP错误、0非预期重启，最高服务内存202.9MiB（门槛300MiB），首页+health组合p95 0.5117秒（门槛2秒）。

### 视觉交付与边界

实际截图与目标稿对照页 `/root/scratch/washjoy-b-verify/b-live-gallery.html` 已 html_preview（390px、879px内容高度、无控制台信息）后 html_render。六张实际截图均PNG可解码，并经artifact-vault备份到公开OSS、HEAD字节核对；源文件与URL清单 `gallery-assets.json`。发布证据/日志见同目录及 DEPLOYMENT.md。

真实门店图片包含街景与外观，内容与 AI 内景概念不相同；界面使用目标布局/色彩/层级，未声称真实素材与概念稿像素完全一致。本轮前端B切片已完成，无需等待再次确认；旧的后端或其他项目任务不据此自动执行。

## 2026-11-07 页面批注增量状态

- 已完成：浮动切换按钮独立全宽居中；搜索/推荐同排；时间入口取代原设置；分类固定六列且私汤最后；地图类别图标、bounds 少于10家显示店名；统一交通像素图标与选中一次性动效。
- 已完成：默认全城、30分钟；公交/骑行/驾车读取高德 `time` 字段，成功缓存15分钟、失败缓存30秒，模式/城市/精确起终点绑定，首批30、总并发3、受限预热及继续加载。
- 代码验证：`bun run typecheck`、`bun run lint`、`bun test unit-tests`（21项）；隔离 Playwright 104项全部通过（320/390/768/1440、深浅主题）。
- 隔离生产构建：服务 `3793`，首页/图标 HTTP 200；真实 smoke 通过：本地 `realApi=true`、`realMapSdk=true`、无浏览器异常；正式线上 smoke 同样通过，地图脚本37个响应均200。
- 发布：`/opt/apps/washjoy-frontend/releases/b-annotations-20261107-115045` 已原子切换为 current；systemd `washjoy-next.service` active；本版本 SSR SHA256 `10c91a761e5849e83d194283005d91e523bc69669a69ed885a3f96bc3a3956ca`；旧版本仍为 `b-warm-20261107-191109` 可回退。
- 观察完成：发布后首页/health各30次，间隔4秒，均30/30 HTTP 200；首页P95 0.1921s、health P95 0.2063s，服务重启0次，cgroup内存峰值约81.4MiB。无须回切。

## 2026-11-07 详情页批注修复

- 用户范围：统一详情图标大小/对齐；后台评论展示为门店介绍，特色服务展示为服务标签。已按当前明确批注及此前发布授权实施。
- 变更：详情SVG统一18×18，动作按钮三列同排等宽、图标/文字居中，地址/电话/营业时间信息行固定图标画布，长地址换行不挤压。description原文保留换行，用React转义后放“门店介绍”；services兼容service_summary，按中英文逗号/顿号/分号/竖线/换行拆分，与原tags去重合并展示。后台资料从用户评价区移出，评价数量只统计真实用户评价。电话兼容公开数据tel字段。没有后台写入/API/数据库/认证变更。
- 验证：typecheck、严格lint通过，23项单测通过；最终构建的24项详情专项（320/390/768/1440深浅色）及8项既有详情/焦点/图片/登录回归全部通过。第一次隔离服务重建后未重启导致旧资源索引引起1项超时，已修正测试环境并完整重跑，最终32项全部通过。
- 发布：current已原子切换至 `/opt/apps/washjoy-frontend/releases/b-detail-20261107-2017`；SSR SHA256 `981efd8f97fc918f12e2edd9e302aa27d26a3315d8fedcc5e6e4270c62176648`。基线 `b-annotations-20261107-115045` 完整保留，独立node_modules、保留旧hash资源；受限配置与发布元数据备份 `/root/backups/washjoy-frontend/b-detail-20261107-2017`。
- 线上：13个首屏build资源、首页/health/sw/manifest均HTTP200。实查海韵之星邮轮水会，门店介绍等于后台原文、7个服务标签、无站长点评重复项，3个动作按钮均116.664px宽且同排、图标均18×18。真实API/高德SDK smoke通过，首图加载正常、未处理浏览器异常0。
- 观察完成：125.39秒、首页/health各25次，全部HTTP200；首页P95 0.2343s、health P95 0.2234s（nearest-rank），最大cgroup内存183.3MiB，自动重启0次。未触发回退阈值。

## 2026-11-07 账户按钮、路线增量读取与全站动效

用户明确要求修账户提交按钮、图片灯箱和全站丰富iOS交互。已修账户submit整宽48px高，失败短抖动/成功确认/忙碌反馈；新增独立全屏HeroUI灯箱、缩略图来源缩放进退、缩放/还原/键盘/双击/触摸拖动与pinch；全局可取消按压、收藏/导航选中回弹、页面区块与筛选弹层进退，减少动态采用即时或80ms淡入。代码源在frontend-next，隔离构建 `/root/scratch/washjoy-motion-20261107/frontend-next`，测试服务3792。

账户按钮与路线读取的本轮小修已发布；全站动效候选仍未发布。类型/lint/23项单测通过；账户按钮专项2/2、首页增量路线与地图专项5/5通过。动效专项112/112、详情专项24/24通过，但性能门禁仍未通过，详见下方诊断记录。

本轮未改API/数据/认证权限，不能宣称iOS真机触觉或真实设备性能已验证。动效候选仍保留在隔离目录，没通过性能门禁不发布。

### 账户按钮与路线增量发布

- 账户提交按钮强制占满表单宽度，`390px` 线上实测按钮 `362×48px`，不再被 HeroUI 固有宽度压成 `28px`。
- 路线预算扩充只对上次预算之后的候选切片；首批 `30` 家后继续查找只请求新增候选，定位/筛选/交通方式上下文变化会重新从首批开始。缓存命中保留，定时刷新可更新已纳入候选。
- 进度文案拆分“已核算候选”和“符合时间门店”，避免把“正在加载30家候选”误读成“已经展示30家”。
- 独立 release：`/opt/apps/washjoy-frontend/releases/b-routing-safe-20261107-235255`；SSR SHA256 `a45f024db2afa9eb57fc3a43dc0a8f507898ce004948f0dfed48a4a22b32e6c9`，发布文件清单 `SHA256SUMS`；回退基线 `b-detail-20261107-2017`，运行依赖独立随版本保存。误含动效候选的旧目录 `b-routing-20261107-230757` 不再是 current。
- 切换后 `washjoy-next.service` active；公网首页、账户页和 API health 均 `200`。发布后观察约 `103.9s`、25 轮首页/health，错误 `0`、重启 `0`、组合 P95 `258.6ms`，未触发回切门槛。

### 动效性能诊断续记（尚未发布）

最终动效专项完整重跑112/112通过（320/390/768/1440、深浅色、减少/普通动态）。之前320px快速缩放失败的那次运行发生在隔离服务中断/并发测试期间；隔离服务恢复后单项复测通过，随后完整套件通过。

性能有多次失败，记录不删除：perf-untraced.log、perf-window-final.log、perf-after-rootfix.log、perf-final-takeover.log、perf-layout-ready.log、perf-handoff.log、perf-compositor-final.log、perf-stable-surfaces.log、perf-precomputed-animations.log，均在 `/root/scratch/washjoy-motion-20261107/`。测试已修正分位数排序/动画真实时钟，CDP trusted input避免测试驱动全页queryRole扫描，精确finish/cancel即时结束窗口；加载阶段长任务分列，真实重叠仍计失败。最终三轮CPU4x的P95均约33.4ms，超33ms比例为8.1/10.8/18.6%，动画内长任务0；规范门槛为P95<=20ms、超33ms<=3%、长任务0，因此帧率仍未达标。空白transform基线3轮为16.7/16.7/16.8ms，不能归因于测试主机。

已实施：静态HeroUI Modal壳/PhotoViewer分离；decode+双rAF布局准备后图片缩放；手势尺寸缓存；WAAPI transform 300ms spring采样关键帧替换逐帧JS，拖动时从DOMMatrix连续接管；隐藏底层动画finite.finish后下一帧开灯箱；POI信息在详情入场后且灯箱关闭时补充；分帧测量和动画启动。动画内长任务已降至0，但帧预算仍失败。最简CPU4x compositor基线通过；应用页面具体合成失帧仍需Chrome tracing专项确认。根因Astra仅在Sol多次性能修复失败后使用。线上维持b-detail版，不发布当前动效候选。

### 性能根因进一步收敛

CPU4x最简transform基线3轮P95 16.7/16.7/16.8ms且长帧0，因此不能宣称VPS环境无法验证。最新应用 `perf-stable-surfaces.log` 仍P95约33.3ms。逐task与真实动画时钟确认：重布局task尾部4–5ms才启动WAAPI/退出CSS动画，却仍构成真实重叠长任务；下一修复将把几何/关键帧准备和动画启动分任务，详情进退同样改布局准备后启动WAAPI，保留HeroUI可访问性职责。Astra代理已完成确定根因修复，仅隔离构建/性能验证；线上仍维持b-detail版，性能门禁未通过所以没有发布。

当前发布决策：保持 `/opt/apps/washjoy-frontend/releases/b-detail-20261107-2017` 为 current。动效候选在隔离目录保留，未切换、未重启生产服务、未修改API/数据。功能测试完成；后续只需做Chrome tracing性能专项并达到既有帧率门槛后再重新评估上线，不得把CPU4x性能失败改写成通过。
