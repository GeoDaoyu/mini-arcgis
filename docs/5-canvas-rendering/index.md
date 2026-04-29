# 5. Canvas 绘制

## DOM vs Canvas

普通前端开发，操作的是 DOM：

```html
<div>Hello</div>
<button onclick="...">点击</button>
```

浏览器帮你管理每个元素的样式、事件、层级——你写标签，浏览器画出来。

但地图不是这样。地图上可能有成百上千个点、线、面，如果每个都是一个 DOM 元素，缩放平移时整个页面直接卡死。

所以 GIS 引擎用的不是 DOM，是 **Canvas**：

```ts
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");

// 画一条线
ctx.beginPath();
ctx.moveTo(0, 0);
ctx.lineTo(100, 100);
ctx.stroke();
```

Canvas 就是一个**画布**——你往上面画像素，它显示出来。没有"元素"的概念，没有 DOM 树，没有 CSS。一个 800×600 的画布，就是 48 万个像素点，你直接控制每个像素的颜色。

**好处是极快**，地图缩放平移时只重绘像素，不操作 DOM。**代价是交互要自己写**——比如点击一个点，你得自己算鼠标位置命中了哪个图形，没有 `onClick` 事件可用。

## Canvas 能做什么

Canvas 2D API 就几个核心能力：

**画图形：**
- `fillRect` / `strokeRect` — 矩形
- `arc` — 圆 / 弧
- `moveTo` + `lineTo` — 折线
- `fill` / `stroke` — 填充 / 描边

**画文字：**
- `fillText` / `strokeText` — 文字
- `font`、`textAlign` — 字体样式

**样式控制：**
- `fillStyle` / `strokeStyle` — 颜色
- `lineWidth` — 线宽
- `globalAlpha` — 透明度

**图像：**
- `drawImage` — 贴图片（比如瓦片图）

**变换：**
- `translate` / `scale` / `rotate` — 平移、缩放、旋转（地图操作的核心）

就这些。把这几个 API 组合起来，你就能画任何东西——点用 `arc`，线用 `lineTo`，面用 `lineTo` + `fill`，标注用 `fillText`，底图用 `drawImage` 贴瓦片。

## 不需要精通 Canvas

你不需要记住每个 API 的参数顺序，也不需要手写复杂的图形算法。

你只需要知道 **Canvas 能做什么**：
- 能用 `drawImage` 贴图片 → 就能做瓦片底图
- 能用 `lineTo` 连线 → 就能画道路、河流
- 能用 `arc` 画圆 → 就能做标记点
- 能用 `fillText` 写文字 → 就能做标注

至于具体的绘制代码怎么写——直接让 AI 生成就行。给他需求："帮我画一个蓝色圆点，半径 8px，红色描边 2px"，他能秒出代码。

**人的工作是搭好架构（Map、Layer、Graphic 怎么组织），AI 的工作是填具体实现（每个 LayerView 的 render 怎么写）。** 这就是为什么前面几章一直在讲架构关系——架子对了，剩下的都是体力活。
