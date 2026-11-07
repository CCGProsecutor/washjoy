# PostgreSQL 迁移说明

`0001_initial.sql` 是 SQLite 现有六张业务表的前向兼容 schema。导入工具必须：

1. 在目标数据库启用事务，先导入 `users`，再导入依赖用户的 `sessions`、`store_overrides` 和 `reviews`。
2. 将 SQLite Unix 秒时间转换为带时区的 UTC `TIMESTAMPTZ`；空值不猜测，遇到非法值直接失败。
3. 使用 `INSERT ... ON CONFLICT ... DO UPDATE`，重复执行不增加记录；不得覆盖更新较新的 `updated_at`。
4. 导入后核对六张表的行数、管理员角色、软删除数量、评价归属和 JSON 图片 URL 数量。
5. 只使用独立迁移角色和最小应用角色；不读取或打印生产密码、Cookie、签名 URL。

真实迁移前必须先从 `/var/lib/washjoy/snapshots/` 选定 SQLite 快照做恢复演练，并记录源文件哈希、目标行数和回滚方式。
