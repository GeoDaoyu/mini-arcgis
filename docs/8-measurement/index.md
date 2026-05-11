# 8. 测量

上一章讲了标绘——用户在地图上画点、线、面。但实际项目中，用户不只是"画"，还需要**量**——这条线段有多长？这个面有多大？这就是本章要解决的问题。

测量是在标绘基础上的功能增强：复用标绘的绘制交互（鼠标点击落点、实时预览、双击完成），同时引入 `@turf/turf` 进行距离和面积计算，并通过新引入的 `TextSymbol` 在地图上显示测量结果。

## 设计：Class 和 ViewModel 分层

和标绘一样，测量模块也是 Class/ViewModel 分层。不同的是，每个测量工具锁定一种几何类型：

```
DistanceMeasurement2D（UI 层）
  └── viewModel: DistanceMeasurement2DViewModel（逻辑层）
        ├── view: MapView
        ├── layer: GraphicsLayer
        ├── state: "ready" | "active"
        ├── vertices: number[][]
        ├── measureGraphic: Graphic | null       ← 绘制的图形
        └── labelGraphic: Graphic | null         ← 测量结果文本

AreaMeasurement2D（UI 层）
  └── viewModel: AreaMeasurement2DViewModel（逻辑层）
        ├── （同上结构）
        └── 锁定 polygon 类型
```

**DistanceMeasurement2D** 锁定 polyline（线段），使用 turf 的 `length()` 计算距离。**AreaMeasurement2D** 锁定 polygon（面），使用 turf 的 `area()` 计算面积。

## 测量计算流程

整个测量链条涉及三个库的配合：

```
用户点击地图
  → 收集顶点 [lng, lat][]
  → arcgisToGeoJSON({ paths: [vertices] })
  → GeoJSON LineString / Polygon
  → turf.length() / turf.area()
  → 数值（米 / 平方米）
  → 格式化 → "1.23 km" / "456 sq m"
  → TextSymbol → 渲染到地图
```

关键转换函数是 `@terraformer/arcgis` 的 `arcgisToGeoJSON()`——它把 ArcGIS 格式的坐标（`paths` / `rings`）转成 turf 需要的 GeoJSON 格式。

## TextSymbol 和 Font

为了在地图上显示测量结果，本章引入了两个新的符号类：

**Font** — 字体描述：

```ts
new Font(
  size: number = 12,           // 字号
  family: string = "sans-serif", // 字体族
  weight: string = "normal",     // 粗细
  style: string = "normal",      // 斜体
  decoration: string = "none"    // 装饰线
)
```

**TextSymbol** — 文本符号，继承自 `Symbol`（type = `"text"`）：

```ts
new TextSymbol({
  text: "1.23 km",                           // 要显示的文本
  color: new Color([255, 255, 255, 1]),      // 文本颜色
  haloColor: new Color([0, 0, 0, 0.7]),      // 描边颜色（光晕）
  haloSize: "2px",                           // 描边宽度
  xoffset: 0,                                // 水平偏移（像素）
  yoffset: 0,                                // 垂直偏移（像素）
  font: new Font(14, "sans-serif", "bold"),   // 字体
})
```

`haloColor` 和 `haloSize` 提供文字描边效果——先画描边（`strokeText`），再画填充（`fillText`），这样文字在任何底图背景上都清晰可见。`GraphicsLayerView` 的渲染调度中新增了 `"text"` 分支，当 `symbol.type === "text"` 时调用专门的 `renderText()` 方法。

## 测量格式化规则

| 测量类型 | 阈值 | 显示格式 | 示例 |
|---------|------|---------|------|
| 距离 | < 1000 m | `X m` | `456 m` |
| 距离 | >= 1000 m | `X.XX km` | `1.23 km` |
| 面积 | < 1,000,000 m² | `X sq m` | `50000 sq m` |
| 面积 | >= 1,000,000 m² | `X.XX sq km` | `2.50 sq km` |

## 基本用法

### 方式一：直接用 ViewModel

```ts
import DistanceMeasurement2DViewModel from "@/widgets/DistanceMeasurement2D/DistanceMeasurement2DViewModel";
import GraphicsLayer from "@/layers/GraphicsLayer";

// 1. 准备一个图层放测量结果
const measureLayer = new GraphicsLayer({ id: "measurement" });
map.add(measureLayer);

// 2. 创建 ViewModel
const distanceVM = new DistanceMeasurement2DViewModel({
  view: mapView,
  layer: measureLayer,
});

// 3. 监听完成事件
distanceVM.on("create", (event) => {
  if (event.state === "complete") {
    console.log("测量完成:", event.graphic.geometry);
    console.log("文本标注:", event.labelGraphic.symbol.text);
    // graphic 和 labelGraphic 已自动添加到 measureLayer 中
  }
});

// 4. 开始测量
distanceVM.start();
```

### 方式二：用 Widget 门面

```ts
const measure = new DistanceMeasurement2D({ view: mapView, layer: measureLayer });
measure.start();
```

面积测量的用法完全一样，只是把 `DistanceMeasurement2D*` 换成 `AreaMeasurement2D*`。

## 和标绘的关键区别

1. **锁定几何类型**：测量工具不需要选择画什么——DistanceMeasurement2D 永远画线，AreaMeasurement2D 永远画面。API 用 `start()` 而非 `create(type)`。

2. **双重输出**：完成时创建**两个** Graphic——一个是几何图形（Polyline/Polygon + 对应符号），一个是标注点（Point + TextSymbol 显示测量值）。两者一起追加到 `layer.graphics` 中。

3. **实时测量**：绘制过程中，overlay canvas 除了渲染几何预览，还会在图形的中点/重心位置实时显示当前测量数值。移动鼠标或增减顶点时，数值即时更新。

4. **颜色区分**：测量工具使用橙色系（`rgba(227, 139, 79, ...)`）绘制，和标绘的蓝色系（`rgba(0, 120, 212, ...)`）形成视觉区别。

## 面测量的特殊处理

`turf.area()` 要求面（Polygon）的环是**闭合的**（首尾顶点坐标相同）。在绘制过程中，顶点数组不包含闭合点，所以测量前需要自动补上第一个顶点作为闭合点。代码逻辑也会检查是否已经闭合，避免重复追加。

## 键盘快捷键

和标绘完全一致：

| 键 | 功能 |
|---|---|
| `C` | 完成当前测量 |
| `Escape` | 取消当前测量 |
| `Backspace` | 撤销上一个顶点 |
| `Ctrl + Z` | 撤销 |
| `Ctrl + Y` / `Ctrl + Shift + Z` | 重做 |

## 交互限制

demo 中只允许一个测量工具处于活跃状态——启动 Distance 会自动取消 Area，反之亦然。同时，测量和标绘也互斥：启动测量会保持测量工具活跃，标绘工具的点击会取消测量。

## 和 GraphicsLayer 的配合

和标绘一样，测量结果（几何图形 + 文本标注）在 `complete` 时自动追加到 `layer.graphics`。因为 `graphics` 是响应式属性，变化会触发自动重绘。

清除测量结果：

```ts
measureLayer.graphics = [];
distanceVM.cancel();  // 取消进行中的测量
areaVM.cancel();
```

## 一句话总结

测量就是在标绘的绘制交互基础上，接入 turf 做空间计算，通过 TextSymbol 把结果显示在地图上。Class/ViewModel 分层让测量工具既可以独立使用，也可以通过 Widget 门面快速集成。
