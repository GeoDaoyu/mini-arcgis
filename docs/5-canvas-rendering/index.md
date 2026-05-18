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

## 进阶：离屏 Canvas 缓存 + 脏标记渲染

### 问题：图层切换时的闪烁

如果你把所有图层画在同一个 canvas 上，切换业务图层（比如勾选 GeoJSONLayer）时会这样：

```
render():
  ctx.clearRect(...)           // ← 清空整个画布，底图瓦片没了
  await tileLayer.render()     // ← 异步加载瓦片，用户看到空白
  await geojsonLayer.render()  // ← 画业务图层
```

`clearRect` 瞬间底图消失，瓦片异步加载有延迟，用户就看到闪烁——底图空白→瓦片逐渐出现。

而标绘和测量工具不闪烁，是因为它们用了**独立的叠加 canvas**，画的时候不碰底图。

### ArcGIS JS API 的做法

ArcGIS 从 4.10 版本开始用 **单 WebGL 上下文 + 每图层离屏帧缓冲（FBO）** 的架构：

- 每个图层渲染到自己的离屏 FBO
- 最终合成时，从各 FBO 贴到主帧缓冲
- 没变化的图层直接复用缓存的 FBO，不重绘

对应到 2D Canvas，就是**离屏 canvas + 脏标记**。

### 我们的实现：两阶段渲染

```
MapView.render()
  │
  ├─ Phase 1: 渲染脏图层到各自的离屏 canvas（可异步）
  │   for each layerView:
  │     if layerView.dirty:
  │       await layerView.render()  // → 画到 offscreenCanvas
  │       layerView.dirty = false   // 标记已更新
  │
  └─ Phase 2: 原子合成到主 canvas（同步，微秒级）
      mainCtx.clearRect(...)
      for each layerView:
        mainCtx.drawImage(layerView.offscreenCanvas, 0, 0)
```

**关键**：Phase 1 期间主 canvas 仍显示旧帧，Phase 2 的 `clearRect → drawImage` 在微秒内完成——用户看不到空白帧。

### 脏标记管理

决定图层是否需要重绘的规则：

| 触发事件 | 行为 |
|---------|------|
| 新增/移除业务图层 | `syncLayerViews()` 增量同步：已有图层保持 clean，仅新图层 dirty |
| zoom / center 变化 | 全部图层 dirty = true（瓦片和要素位置都变了） |
| basemap 变化 | 增量同步，变化的图层 dirty |

增量同步（`syncLayerViews`）：对比当前 `allLayers` 和已有 `layerViews`，移除不存在的、保留已有的、创建新增的——避免销毁并重建所有 LayerView 对象。

### 为什么这等价于"不碰底图"

当你勾选 GeoJSONLayer 时：

1. `syncLayerViews()` 为 GeoJSONLayer 创建新 LayerView（`dirty = true`）
2. 已有的 TileLayerView **保留**，且 `dirty = false`
3. Phase 1：只渲染 GeoJSON 的离屏 canvas（同步，无异步等待）
4. Phase 2：`clearRect` + 从缓存贴底图 + 从新 canvas 贴 GeoJSON
5. 底图瓦片没有重新加载——直接用的上次缓存

和标绘的"独立叠加 canvas"思路一样，只不过这里是**内存中的离屏 canvas 缓存**，而不是 DOM 中的叠加元素。

### 对应关系

| ArcGIS JS API | mini-arcgis |
|---------------|-------------|
| 单 WebGL 上下文 | 单 2D canvas |
| 每图层离屏 FBO | 每图层 `offscreenCanvas` |
| `bindRenderTarget()` 合成 | Phase 2 `drawImage` 原子合成 |
| `requestRender()` | `this.view.render()` |
| 隐式脏标记（data watch） | 显式 `dirty` 布尔值 |
