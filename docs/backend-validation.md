# 后端验证记录

本验证由 `server/tests/validate_postgres_api.sh` 执行。脚本从受保护环境读取生产数据库连接串，但不输出连接串、用户资料或任何业务记录。

验证步骤：

- 创建带时间戳的独立 `washjoy_verify_*` PostgreSQL 数据库。
- 以临时 loopback API 和自造帐号完成健康检查、未认证拒绝、注册、登录、登出、管理员权限、门店创建、评价创建与删除、软删除、恢复和重启后会话持久化。
- 用 `pg_dump --format=custom` 将生产 PostgreSQL 备份至 `/root/backups/washjoy-时间戳/production.dump`，恢复到独立数据库，再比较六张应用表的计数。
- 退出时删除脚本创建的验证和恢复数据库、临时 API 进程及夹具目录；保留受限权限的生产备份。

运行前需完成 release 构建，并将验证二进制路径传入 `WASHJOY_VERIFY_BIN`。默认路径是 `server/target/release/washjoy-api`。

```bash
cd /root/.t3/projects/washjoy/server
CARGO_BUILD_JOBS=2 cargo build --release --locked
WASHJOY_VERIFY_BIN="$PWD/target/release/washjoy-api" ./tests/validate_postgres_api.sh
```

本文件只描述验证流程。真实完成状态、备份路径、产物校验和失败证据须在每次运行后追加，不能预先标记为完成。
