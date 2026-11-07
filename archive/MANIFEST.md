# 归档清单

生成时间：2026-11-04

## 已归档

- `/tmp/washjoy-amap/` -> `amap/`
- `/tmp/washjoy-deep/` -> `data-snapshots/deep/`（南京 1000、扬州 978、镇江 1000）
- `/tmp/washjoy-expanded/` -> `data-snapshots/expanded/`
- `/root/scratch/washjoy-assets/` -> `assets/`
- `/root/scratch/washjoy-*.png` -> `screenshots/`
- `/root/scratch/washjoy-test-artifacts/` -> `test-artifacts/`
- `.playwright-mcp/` -> `browser-artifacts/`
- `/tmp/washjoy-*.log`、浏览器输出和 HTML -> `build-logs/`
- `/var/www/html/washjoy.bak-*` -> `deployment-backups/`
- `/var/www/html/washjoy/`（不含私有运行目录） -> `deployment/`

## 未迁移

- `/var/lib/washjoy/washjoy.sqlite3` 及 `snapshots/`：生产数据库和回滚快照，必须留在受保护运行目录。
- `/var/lib/washjoy/data/`：当前 API 使用的基础门店数据目录。
- `/var/www/html/washjoy/private/`、`uploads/`：私有数据和用户上传，不能进入源码归档。
- `/etc/washjoy.env`：权限受保护的生产环境配置，含凭据。
- 临时 Cookie、密钥和包含认证信息的文件：不复制。

原始文件均保留在原位置；本次操作只做复制归档，没有删除或覆盖生产文件。
