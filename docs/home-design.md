# 首页空间与动效

参考用户提供的 [Land-book 电商设计目录](https://land-book.com/design/ecommerce)，选取浅色层次、细边框和宽留白的方向。目录中的 [Nossara](https://land-book.com/websites/100924-nossara-imabari-towels-made-in-japan) 与 [Dimwit](https://land-book.com/websites/100080-solid-brass-dimmer-switches) 均标有背景图、柔和配色类别。此次未复制案例图片、品牌内容或代码；首页背景为本站绘制的装饰性 SVG 轮廓图形。

- 首页隐藏重复的右侧更新与标签栏，主列使用可用宽度。宽屏文章卡片使用两列，第一篇横跨两列；项目卡片按可用宽度排布。手机保持紧凑列表。
- 桌面顶部提供“收起导航 / 展开导航”按钮。左侧导航完整滑出后，内容区扩大；选择写入本地 `site-sidebar`，跨页面与刷新保留。该设置只保存在浏览器，不发送到服务端。
- 小于 850px 时仍使用 Chirpy 原有抽屉与遮罩，桌面收起偏好不影响手机导航。隐藏侧栏会设为 inert，防止键盘进入不可见区域；按钮状态通过 aria-expanded 表达。
- SVG 背景只有 1.5 秒入场，不循环。精确指针最多带来 6px 位移，使用有界请求与 CSS 过渡，触摸不启用。系统选择减少动态效果时，关闭背景、按钮与导航过渡。
- 无脚本时导航保持展开、介绍文字和背景正常显示；本地存储不可用时仍可切换导航。

实现：`home.css` / `home-scene.js` / `site-navigation.css` / `site-navigation.js`；验收：`tools/check_home_space.cjs` 及原有移动菜单、页面切换、React Bits 动效检查。
