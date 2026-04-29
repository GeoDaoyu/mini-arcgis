# 4. 要素与图层

这一章梳理 mini-viewer 中几个核心概念之间的关系。搞清楚了它们，整个引擎的骨架就通了。

## 关系一：View 和 Map

`MapView` 负责**渲染**，`Map` 负责**管理数据**。一个 View 持有一个 Map：

```
MapView ──拥有──→ Map
  │                 │
  │  toScreen()     │  layers[]
  │  toMap()        │  add() / remove()
  │  render()       │
```

View 不关心 Map 里面有什么图层，它只做三件事：

- 把经纬度转成屏幕像素（`toScreen()`）
- 把屏幕像素转回经纬度（`toMap()`）
- 遍历 Map 的图层，逐个调用它们的 `render()`

Map 也不关心自己怎么被画出来，它只管维护图层列表（增删查改）。

**这就是 MVVM 中的 V 和 M**——View 只负责呈现，Map 只负责数据。谁都不越界。

## 关系二：Map 和 Layers

Map 就是一个**图层容器**。你往里面加图层，它帮你管理：

```ts
const map = new Map();
map.add(new TileLayer({ url: "..." })); // 底图
map.add(new GraphicsLayer()); // 标注点
map.add(new GeoJSONLayer({ url: "..." })); // 业务数据
```

Map 不关心每个图层具体怎么渲染——那是 LayerView 的事。Map 只负责：

- 增删图层（`add` / `remove`）
- 按 ID 查找（`findLayerById`）
- 清空全部（`removeAll`）

图层之间是**平级叠加**的关系，先加的在下，后加的在上，就像 Photoshop 里的图层一样。

## 关系三：Layer 和 Graphic（Feature）

Layer 是"图层"，Graphic 是图层里的"一个个东西"。

- `TileLayer` 图层里是**瓦片图片**（一堆小方块）
- `GraphicsLayer` 图层里是**Graphic 对象**（点、线、面）
- `GeoJSONLayer` 图层里也是 Graphic，只不过数据源是 GeoJSON

以 `GraphicsLayer` 为例：

```ts
const graphicsLayer = new GraphicsLayer();
const graphic = new Graphic({
  geometry: new Point({ longitude: 120, latitude: 30 }),
  attributes: { name: "杭州", population: 12000000 },
});
graphicsLayer.add(graphic);
```

一个 Layer 可以包含很多 Graphic，就像表格里的"行"。

## 关系四：Graphic 的 attribute 和 geometry

每个 Graphic 由两部分组成：

```
Graphic
├── geometry      # 空间信息——这个东西"在哪"
│   ├── Point     （经度，纬度）
│   ├── Polyline  [点1, 点2, 点3, ...]
│   └── Polygon   [[外环], [内环1], ...]
│
└── attributes    # 属性信息——这个东西"是什么"
    { name: "杭州", population: 12000000, ... }
```

两部分职责分明：

- **geometry** 负责空间位置——决定这个要素画在屏幕的什么位置
- **attributes** 负责业务属性——弹窗里显示什么

打个比方：geometry 是图钉钉在地图上的位置，attributes 是贴在旁边便利贴上的内容。一个回答"在哪"，一个回答"是什么"。

---

搞清这四层关系，整个 mini-viewer 的数据流就一目了然了：

```
MapView（渲染调度）
  └── Map（图层管理器）
        └── Layer[]（多个图层叠加）
              └── Graphic[]（每个图层里的要素）
                    ├── geometry（在哪）
                    └── attributes（是什么）
```
