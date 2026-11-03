#!/bin/bash
# 部署 SvelteKit 静态站到 /var/www/html/washjoy
# 用法: ./deploy-static.sh [--build]
set -euo pipefail
cd /root/.t3/projects/washjoy
if [[ "${1:-}" == "--build" ]]; then npm run build; fi
[[ -d build ]] || { echo "build/ 不存在，先 npm run build"; exit 1; }
TS=$(date +%Y%m%d-%H%M%S)
cp -a /var/www/html/washjoy "/var/www/html/washjoy.bak-$TS"
# data/ 已迁到 /var/lib/washjoy/data，被后端读取；uploads/ 是用户上传；
# 这两类运行时目录不属于构建产物，绝不能 --delete 掉。
rsync -a --delete \
  --exclude 'data/' --exclude 'uploads/' --exclude 'private/' \
  build/ /var/www/html/washjoy/
mkdir -p /var/www/html/washjoy/uploads
echo "deployed. backup: /var/www/html/washjoy.bak-$TS"
