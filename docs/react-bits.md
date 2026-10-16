# React Bits 动效来源与适配

本网站使用 React Bits 的六种动效，在 Jekyll 页面中适配为原生 DOM、Web Animations API、SVG、Canvas 与 CSS，未引入 React、Motion 或 GSAP 运行时。改编代码是本网站的一部分，不作为独立组件库分发。

- 上游：https://github.com/DavidHDev/react-bits
- 首轮核对版本：`963f4d21dca65326a470956c42b7b467804f3c14`（2026-10-16）
- 交互动效核对版本：`7381f14b15e8f9e00b01ce5b6ac4416f7ee360c4`（2026-10-16）；许可证核对自上游 `LICENSE.md`。
- 作者：David Haz；许可证：MIT + Commons Clause，完整文本保留于 `assets/licenses/react-bits.txt`。

| 上游组件 | 本站位置 | 适配内容 |
| --- | --- | --- |
| [BlurText](https://github.com/DavidHDev/react-bits/blob/963f4d21dca65326a470956c42b7b467804f3c14/src/content/TextAnimations/BlurText/BlurText.jsx) | 首页介绍标题 | 保留三段模糊、位移回弹和逐字错峰；减至 6px 模糊、12px 位移；中文分组避免姓名被拆行；原文作为可访问名称。 |
| [AnimatedContent](https://github.com/DavidHDev/react-bits/blob/963f4d21dca65326a470956c42b7b467804f3c14/src/content/Animations/AnimatedContent/AnimatedContent.jsx) | 项目卡片与阅读路线卡片 | 保留一次性垂直位移及透明度入场；位移 18px、时长 600ms；以 IntersectionObserver / WAAPI 替代 ScrollTrigger / GSAP。默认内容可见，无脚本时可正常阅读。 |
| [SpotlightCard](https://github.com/DavidHDev/react-bits/blob/963f4d21dca65326a470956c42b7b467804f3c14/src/content/Components/SpotlightCard/SpotlightCard.jsx) | 桌面项目卡片 | 保留指针相对坐标、径向柔光和指数平滑跟随；使用本站主题色，移除环境光、按压闪光、噪点及全局指针监听，静止后停止绘制；键盘聚焦时显示中央柔光。 |
| [Magnet](https://github.com/DavidHDev/react-bits/blob/7381f14b15e8f9e00b01ce5b6ac4416f7ee360c4/src/content/Animations/Magnet/Magnet.jsx) | 首页两个主要入口 | 保留稳定外层、指针偏移与弹簧回位；偏移上限 4px，提高阻尼，仅使用元素内指针事件。手机不启用，键盘聚焦复位；弹簧静止即停止 rAF。 |
| [StarBorder](https://github.com/DavidHDev/react-bits/blob/7381f14b15e8f9e00b01ce5b6ac4416f7ee360c4/src/content/Animations/StarBorder/StarBorder.jsx) | 常用主题、分类卡片与关于页入口 | 保留沿圆角轮廓行进的短拖尾和交互触发的一圈运动。以 SVG 矩形轮廓、WAAPI 和 ResizeObserver 替代 Canvas 路径计算；单圈 1100ms，保留静态边框，去掉循环巡航、星尘与闪烁。 |
| [ClickSpark](https://github.com/DavidHDev/react-bits/blob/7381f14b15e8f9e00b01ce5b6ac4416f7ee360c4/src/content/Animations/ClickSpark/ClickSpark.jsx) | 首页入口、记录类型锚点、全部标签开关与桌面收放按钮 | 保留径向线段、三次缓出与线段缩短；6 条短线、12px 半径、300ms。使用 44px 临时 Canvas，最多保留 4 个，按压和点击去重；触摸滚动不在按下时触发，键盘点击以控件中心触发。原生链接和按钮立即处理，不等待动画。 |

手机触摸模式不启用磁吸与指针跟随光效。系统选择减少动态效果时，不拆分标题、不播放入场、隐藏柔光和交互装饰；设置在页面打开后变化也会立即停止效果并移除点击 Canvas。返回历史页面不会重新播放入场。页面隐藏或离开时会清理交互动画。没有链接拦截、自动滚动或循环动画。

对应实现：`assets/js/react-bits.js`、`assets/js/react-bits-interactions.js`、`assets/css/react-bits.css`。浏览器行为验收：`tools/check_react_bits.cjs`。
