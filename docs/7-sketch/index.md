# 7. 标绘

前面几章讲了图层和图形——TileLayer 做底图、GraphicsLayer 放图形、Graphic 存几何和属性。但图形哪来的？如果是 GeoJSON 文件或服务端数据，加载就有了。如果用户要在地图上**自己画**——点个标记、画条线、圈个面——就得用标绘。

标绘是 mini-arcgis 中第一个真正意义上的"地图交互"模块。前面几章关注的是怎么搭架构（Map → Layer → Graphic），这一章关注的是**用户怎么和地图互动**——鼠标点击落点、移动预览、键盘快捷键、事件监听。标绘模块完整展示了这套交互机制的运转方式。

## 设计：Class 和 ViewModel 分层

标绘模块拆成两个类：

```
Sketch（UI 层）
  └── viewModel: SketchViewModel（逻辑层）
        ├── view: MapView
        ├── layer: GraphicsLayer
        ├── state: "ready" | "active"
        ├── activeTool: "point" | "polyline" | "polygon" | ...
        └── createGraphic: Graphic | null
```

**Sketch** 是对外的门面——暴露属性（`view`、`layer`、`state`、`activeTool`、`createGraphic`），方法代理给 ViewModel。**SketchViewModel** 干所有脏活累活——接管鼠标键盘事件、管理顶点、渲染临时预览、发射事件。

为什么要分层？实际项目中你可能用自己的 UI（自定义工具栏、右键菜单、快捷键），这时直接用 SketchViewModel 就行，不必绑死在一个特定 UI 上。**View 负责呈现，ViewModel 负责逻辑**——这就是 MVVM 贯穿整个项目的地方。

## 核心：create 事件

标绘的整个生命周期通过一个 `create` 事件串联。事件按 `state` 分四个阶段：

```
create("polygon")
  │
  ├─ state: "start"        ← 标绘启动，准备就绪
  │
  ├─ state: "active"       ← 用户每次点击添加顶点时触发
  │     event.vertices       （可调用 preventDefault() 阻止添加，比如自交检测）
  │     event.graphic = null
  │
  ├─ state: "complete"     ← 用户双击 / 按 C 键完成
  │     event.graphic        完整的 Graphic 对象，geometry + symbol 齐全
  │
  └─ state: "cancel"       ← 用户按 Escape / 调用 cancel()
        event.graphic = null  已画的内容全部丢弃
```

监听方式：

```ts
sketchViewModel.on("create", (event) => {
  if (event.state === "complete") {
    // 拿到最终图形
    console.log(event.graphic.geometry);
  }
});
```

除了 `create`，还有独立的 `undo` 和 `redo` 事件，分别在撤销 / 重做时触发。

## 交互是怎么发生的

标绘的本质是把 DOM 事件转换成地图操作。整个过程分三步：

**第一步：接管鼠标。** `SketchViewModel.create()` 被调用后，立即在 MapView 的 Canvas 上注册 capture 阶段的 `mousedown` / `mousemove` / `dblclick` 监听器。capture 阶段优先于 MapView 自身的 bubble 阶段监听器，所以标绘期间地图不会平移缩放——鼠标事件被标绘"劫持"了。

**第二步：坐标转换。** 每次鼠标事件触发，通过 `MapView.toMap(event)` 把屏幕像素转成经纬度坐标 `[lng, lat]`，这就是顶点。点、线、面的所有顶点都存成经纬度数组，最终构建 `Point` / `Polyline` / `Polygon` 几何对象。

**第三步：事件通知。** 每个动作（开始、加顶点、完成、取消）都通过 `create` 事件广播出去，外部只需 `on("create", callback)` 就能感知标绘的每一步。这种"内部处理 + 外部通知"的模式，和 DOM 的 `addEventListener` 思路一致。

```ts
// 外部视角：只需监听，不用关心内部如何实现
sketchVM.on("create", (event) => {
  switch (event.state) {
    case "start":
      /* 开始画了 */ break;
    case "active":
      /* 正在画，event.vertices 持续更新 */ break;
    case "complete":
      /* 画完了，event.graphic 可用 */ break;
    case "cancel":
      /* 取消了 */ break;
  }
});
```

这种事件驱动的方式是地图交互的通用模式——后续的编辑（update）、选择（hitTest）都会沿用同一个套路。

## 支持的几何类型

| 类型         | 操作           | 完成方式                |
| ------------ | -------------- | ----------------------- |
| `point`      | 单击放置       | 单击即完成              |
| `multipoint` | 多次点击添加点 | 双击 / C 键             |
| `polyline`   | 点击添加顶点   | 双击 / C 键             |
| `polygon`    | 点击添加顶点   | 双击 / C 键（自动闭合） |

## 基本用法

```ts
import SketchViewModel from "@/widgets/Sketch/SketchViewModel";
import GraphicsLayer from "@/layers/GraphicsLayer";

// 1. 准备一个图层放标绘结果
const sketchLayer = new GraphicsLayer({ id: "sketch" });
map.add(sketchLayer);

// 2. 创建 SketchViewModel
const sketchVM = new SketchViewModel({
  view: mapView,
  layer: sketchLayer,
});

// 3. 监听完成事件
sketchVM.on("create", (event) => {
  if (event.state === "complete") {
    console.log("绘制完成:", event.graphic.geometry.type);
    // graphic 已自动添加到 sketchLayer 中
  }
});

// 4. 开始标绘
sketchVM.create("polygon");
```

也可以直接用 Sketch 类——它包了一层，API 一样，但多暴露了 `view`、`layer`、`state` 等只读属性：

```ts
const sketch = new Sketch({ view: mapView, layer: sketchLayer });
sketch.create("polyline");
```

## 临时预览如何工作

标绘过程中，用户需要看到"正在画的图形"。mini-arcgis 的做法是不动主 Canvas——在它上面叠加一个透明 `<canvas>`（`pointer-events: none`，z-index 更高），所有预览绘制都在这层上：

```
┌─────────────────────┐
│  透明 overlay canvas │ ← 临时预览：顶点圆点、橡皮筋线、虚线框
├─────────────────────┤
│  主 canvas           │ ← 底图瓦片 + 已完成的图形
└─────────────────────┘
```

完成或取消时，overlay 被清除并移除。这样做的好处是标绘预览和地图渲染互不干扰——底图该怎么画怎么画，预览层独立在上面。

## 和 GraphicsLayer 的配合

标绘完成后，`SketchViewModel` 自动把新 Graphic 加到 `layer.graphics` 中。因为 `Layer` 继承了 `Accessor`，`graphics` 是响应式属性——一变化，`GraphicsLayerView` 的 watcher 自动触发 `MapView.render()`，新图形就出现在地图上了。全程不需要手动调 `view.render()`。

清除所有标绘结果也很简单：

```ts
// 清空图层 + 取消进行中的标绘
sketchLayer.graphics = [];
sketchVM.cancel();
```

因为 `graphics` 是响应式的，设成空数组会自动触发重绘。

## 渲染流程中的位置

标绘图层应该放在**最上层**，确保图形不被底图盖住：

```ts
map.add(osmLayer); // 底图在最下
map.add(dataLayer); // 业务数据在中间
map.add(sketchLayer); // 标绘在最上
```

## 一句话总结

标绘就是把用户的鼠标操作转换成 Graphic，自动存到 GraphicsLayer 里。Class/ViewModel 分层让你既可以用默认 UI 快速集成，也可以基于 ViewModel 自己搭交互。响应式渲染让数据变化自动反映到画布上——你只管改 `graphics` 数组，剩下的引擎搞定。
