# React Bits 动效来源与适配

本网站使用 React Bits 的三种动效，在 Jekyll 页面中适配为原生 DOM、Web Animations API 与 CSS，未引入 React、Motion 或 GSAP 运行时。改编代码是本网站的一部分，不作为独立组件库分发。

- 上游：https://github.com/DavidHDev/react-bits
- 核对版本：`963f4d21dca65326a470956c42b7b467804f3c14`（2026-10-16）
- 作者：David Haz；许可证：MIT + Commons Clause，完整文本保留于 `assets/licenses/react-bits.txt`。

| 上游组件 | 本站位置 | 适配内容 |
| --- | --- | --- |
| [BlurText](https://github.com/DavidHDev/react-bits/blob/963f4d21dca65326a470956c42b7b467804f3c14/src/content/TextAnimations/BlurText/BlurText.jsx) | 首页介绍标题 | 保留三段模糊、位移回弹和逐字错峰；减至 6px 模糊、12px 位移；中文分组避免姓名被拆行；原文作为可访问名称。 |
| [AnimatedContent](https://github.com/DavidHDev/react-bits/blob/963f4d21dca65326a470956c42b7b467804f3c14/src/content/Animations/AnimatedContent/AnimatedContent.jsx) | 项目卡片与阅读路线卡片 | 保留一次性垂直位移及透明度入场；位移 18px、时长 600ms；以 IntersectionObserver / WAAPI 替代 ScrollTrigger / GSAP。默认内容可见，无脚本时可正常阅读。 |
| [SpotlightCard](https://github.com/DavidHDev/react-bits/blob/963f4d21dca65326a470956c42b7b467804f3c14/src/content/Components/SpotlightCard/SpotlightCard.jsx) | 桌面项目卡片 | 保留指针相对坐标、径向柔光和指数平滑跟随；使用本站主题色，移除环境光、按压闪光、噪点及全局指针监听，静止后停止绘制；键盘聚焦时显示中央柔光。 |

手机触摸模式不启用跟随光效。系统选择减少动态效果时，不拆分标题、不播放入场、隐藏柔光；设置在页面打开后变化也会立即停止效果。返回历史页面不会重新播放入场。没有链接拦截、自动滚动或循环动画。

对应实现：`assets/js/react-bits.js`、`assets/css/react-bits.css`。浏览器行为验收：`tools/check_react_bits.cjs`。
