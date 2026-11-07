# Washjoy 验收清单

- [ ] PLAN 的功能、数据、权限和回滚边界已核对，未删除既有能力。
- [ ] `bun install --frozen-lockfile`、typecheck、lint、构建和 Playwright 通过。
- [ ] `cargo fmt --check`、`cargo clippy --all-targets --all-features -- -D warnings`
  和 `cargo test --locked` 通过。
- [ ] HeroUI v3、Tailwind 令牌、Motion、移动窄屏、长数据、键盘、错误恢复和 reduced-motion 通过。
- [ ] API 鉴权、幂等、事务、分页、超时、实时刷新和媒体授权已验证。
- [ ] SQLite 数据、门店覆盖、账户归属和图片引用有备份与恢复证据。
- [ ] Debian 12、Angie、systemd、服务健康检查、日志轮转和数据库权限验证完成。
- [ ] 产物 SHA/校验和与本机构建结果一致；公开仓库的 GitHub Actions 仅作辅助复核。
- [ ] 真实入口回归通过，失败回滚步骤可执行，发布后资源观察已记录。
