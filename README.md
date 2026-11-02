<img src="assets/icon.svg" width="64" height="64" alt="">

# Washjoy

Created in [T3 Code](https://t3.codes).

## UI 视觉稿

统一视觉方向：温泉绿、暖木色、白底卡片，面向 iOS 客户端的地图发现与门店信息展示。

- [附近首页](public/ui-boards/washjoy-ui-home.png)
- [门店详情悬浮页](public/ui-boards/washjoy-ui-place-detail.png)
- [技师详情页](public/ui-boards/washjoy-ui-technician.png)
- [我的](public/ui-boards/washjoy-ui-mine.png)
- [提交新店](public/ui-boards/washjoy-ui-submit.png)

线上预览：`https://fehd.top/washjoy/`

## 图片托管

项目原始图片保留在仓库的 `public/assets` 和 `public/ui-boards`，作为 GitHub 备份源；线上页面使用阿里云 OSS 的 HTTPS 地址加载静态图片，路径前缀为 `https://fehd.oss-cn-shanghai.aliyuncs.com/washjoy/assets/`。未备案域名不作为 CDN 加速域名使用。

## 地图接入说明

当前定位使用浏览器 Geolocation API。正式地图接入前需准备门店经纬度并选择地图服务商；浏览器地图 SDK 由访问者设备请求，香港服务器不能保证访问者网络可连通。Google Maps 需要启用计费并限制浏览器密钥的 HTTP referrer 与 API 权限，密钥通过部署环境注入，不提交到仓库。面向中国大陆用户时，应先实测地图瓦片、地理编码和路线 API 的连通性与坐标系，再决定使用 Google Maps 或国内地图服务。
