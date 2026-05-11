# 8. 测量

上一章讲了标绘——用户在地图上画点、线、面。画出来之后，自然会想问：**这条线有多长？这个面有多大？** 这就是测量。

## 思路：Sketch + turf = 测量

测量本质上就是**标绘 + 空间计算**。标绘负责收集用户画的顶点坐标，空间计算负责把坐标变成距离或面积数值。测量不需要新的绘制逻辑——直接复用 Sketch 的鼠标交互、顶点管理、临时预览即可，只是在完成时多算一步。

```
标绘的顶点 [lng, lat][]
  → 格式转换（ArcGIS → GeoJSON）
  → turf.length() / turf.area()
  → "1.23 km" / "50000 sq m"
```

这就是为什么上一章花了那么多篇幅讲标绘——它是所有地图交互的基石。测量、编辑、空间查询，都是在标绘的基础上叠加领域逻辑。

## 测量是最基础的空间分析

空间分析有很多种：缓冲区分析（buffer）、叠加分析（intersect / union）、网络分析（最短路径）、插值分析……但测量是最基础、最常用的一种。它的输入只是坐标，输出只是数值，不需要额外的数据源，非常适合作为"第一个空间分析功能"来实践。

做空间分析，有两种方式：

1. **引入专业库**（如 `@turf/turf`）——turf 提供了几十种空间分析函数，覆盖了缓冲区、叠加、聚类、网格等常见需求。
2. **自己写公式**——比如距离公式（Haversine）、面积公式（Shoelace），适合学习原理但不能用于生产（地球是椭球，不是平面）。

本项目中测量用的是 turf。在真正的生产项目中，turf 也是一个靠谱的选择——ArcGIS 官方也在用。

## 对我们库的要求：格式转换

turf 接受 GeoJSON 格式，而我们库的几何数据是 ArcGIS 格式（`paths` / `rings`）。所以接入 turf 的唯一障碍就是**格式转换**。

`@terraformer/arcgis` 提供了一个函数搞定这件事：

```ts
import { arcgisToGeoJSON } from "@terraformer/arcgis";
import { length, area } from "@turf/turf";

// 线段：paths → LineString → 距离
const vertices = [[120, 30], [121, 30], [121, 31]];
const line = arcgisToGeoJSON({ paths: [vertices] });
const d = length(line, { units: "meters" });  // 线段长度（米）

// 面：rings → Polygon → 面积
const polygon = arcgisToGeoJSON({ rings: [vertices] });
const a = area(polygon);  // 面积（平方米）
```

`arcgisToGeoJSON()` 做了两件事：把 `paths` 映射为 GeoJSON 的 `LineString` 坐标数组，把 `rings` 映射为 `Polygon` 坐标数组。坐标值本身不变——两种格式的坐标都是 `[lng, lat]`，只是结构的键名不同。

一旦数据到了 GeoJSON，整个 turf 生态就通了——`buffer()`、`intersect()`、`centroid()`、`bbox()`……格式转换是打通两个世界的钥匙。

## 设计：Class 和 ViewModel 分层

和标绘一样，测量模块也是 Class/ViewModel 分层。不同的是，每个测量工具锁定一种几何类型：

```
DistanceMeasurement2D（UI 层）
  └── viewModel: DistanceMeasurement2DViewModel（逻辑层）
        ├── view: MapView
        ├── layer: GraphicsLayer
        ├── state: "ready" | "active"
        ├── vertices: number[][]
        ├── measureGraphic: Graphic | null       ← 绘制的几何图形
        └── labelGraphic: Graphic | null         ← 测量结果文本标注

AreaMeasurement2D（UI 层）
  └── viewModel: AreaMeasurement2DViewModel（逻辑层）
        ├── （同上结构）
        └── 锁定 polygon 类型
```

测量 ViewModel 内部复用了标绘的整套交互机制（鼠标接管、overlay canvas、键盘快捷键），只在 `_renderTemporary()` 和 `_complete()` 中增加了测量计算和文本标注的步骤。

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

## 一句话总结

测量就是标绘 + 空间计算。标绘负责收集坐标，turf 负责把坐标变成数值，`@terraformer/arcgis` 负责让两种格式对上话。搞定了格式转换，整个 turf 生态就为你所用——测量只是冰山一角。
