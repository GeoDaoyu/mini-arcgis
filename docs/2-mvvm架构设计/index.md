# 2. MVVM 架构设计

这一章没什么高深的东西，就是一句话：**数据和渲染分开**。

## 为什么分开？

想象一下，如果绘制代码和数据管理都写在一个类里——改个渲染效果要动数据逻辑，换个数据源要动绘制代码。几百行之后你自己都不想看了。

分开之后：
- **Map** 负责数据（图层列表、增删改查）
- **MapView** 负责渲染（Canvas 绘制、坐标转换、事件处理）
- 谁都不越界，各管各的

这就是 MVVM 在这个项目里的全部含义——**M 是 Map，V 是 MapView**。没有 ViewModel，不需要那么复杂。

## Map：数据层

Map 就是一个图层管理器。它的全部职责：

```ts
class Map {
  layers: Layer[];

  add(layer: Layer): void;       // 加图层
  remove(layer: Layer): Layer;   // 删图层
  findLayerById(id: string): Layer | undefined;  // 找图层
  removeAll(): void;             // 清空
}
```

没了。它不知道 Canvas 是什么，不知道屏幕像素，不知道用户交互。它只知道"我有哪些图层"。

## MapView：渲染层

MapView 持有一个 Map，负责把它画出来：

```ts
class MapView {
  map: Map;                      // 持有的数据模型
  canvas: HTMLCanvasElement;     // 画布

  toScreen(lng, lat): {x, y};   // 经纬度 → 屏幕像素
  toMap(x, y): {lng, lat};      // 屏幕像素 → 经纬度
  render(): void;               // 遍历所有图层，逐个渲染
}
```

View 不关心图层里面有什么数据，它只做一件事：**遍历 Map 里的图层，让每个图层的 LayerView 把自己画出来**。

## LayerView：每个图层的画笔

MapView 本身不会画瓦片、画点、画线——它把这些活分派给各图层的 `LayerView`：

```ts
class MapView {
  render() {
    for (const layer of this.map.layers) {
      layer.layerView.render(this.context);  // 每个图层自己画自己
    }
  }
}
```

每种图层都有自己的 LayerView：`TileLayerView` 画瓦片，`GraphicsLayerView` 画图形，`GeoJSONLayerView` 画 GeoJSON……

**这就是整个架构的闭环**：

```
用户操作 MapView（拖拽、滚轮）
  → MapView 更新自己的状态（中心点、缩放）
  → MapView.render()
  → 每个 LayerView.render()
  → Canvas 上出新画面
```

## 数据驱动渲染

`MapView` 用 `@geodaoyu/accessor` 库做属性监听——状态变了自动触发重绘：

```ts
import { reactiveUtils } from "@geodaoyu/accessor";

// center、zoom 等属性变化时，自动调用 render()
reactiveUtils.watch(
  () => [this.center, this.zoom, this.rotation],
  () => this.render()
);
```

不需要手动在每个地方写 `this.render()`，属性一改，画面自动更新。这就是所谓的"响应式"——就这么简单，没有更多魔法了。
