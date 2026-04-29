# 6. 常见二维图层

前面讲了图层是叠加在 Map 上的，这一章看看实际项目中常用的几种图层类型。理解了它们的区别，用的时候就知道该选哪个。

## 总览

mini-viewer 里的图层继承关系：

```
Layer（基类）
├── TileLayer         ← 切片底图
│   ├── OpenStreetMapLayer
│   └── TianDiTuLayer
├── MapImageLayer     ← 服务端动态渲染
├── GraphicsLayer     ← 手动添加图形
├── GeoJSONLayer      ← 加载 GeoJSON 数据
└── FeatureLayer      ← 加载 ArcGIS FeatureService
```

每个图层都有对应的 `LayerView` 处理渲染，但作为使用者你不需要关心这个——你只管往 Map 里加 Layer 就行。

## TileLayer（切片图层）

最常用的底图。把世界切成一张张小方块（256×256），按缩放级别和行列号取对应图片，贴上 Canvas。

```
zoom 0: 1 张图
zoom 1: 4 张图
zoom 2: 16 张图
...
```

**什么时候用：** 底图。OSM、天地图都是这种。

```ts
map.add(new OpenStreetMapLayer());
map.add(new TianDiTuLayer({ url: "..." }));
```

## MapImageLayer（动态地图图层）

不走切片，每次请求服务端动态生成一张完整地图图片，你指定范围，服务器返回对应图片。

**什么时候用：** 服务端渲染、动态数据展示。ArcGIS Server 的动态地图服务就是这种模式。

```ts
map.add(new MapImageLayer({
  url: "https://services.arcgisonline.com/ArcGIS/rest/services/..."
}));
```

## GraphicsLayer（图形图层）

自己往里加 `Graphic` 对象的图层。点、线、面都可以手动构造然后加进去。

**什么时候用：** 用户标注、点击落点、画线、画多边形——任何"用户交互产生的图形"。

```ts
const layer = new GraphicsLayer();
layer.add(new Graphic({
  geometry: new Point({ longitude: 120, latitude: 30 }),
  attributes: { name: "杭州" }
}));
```

## GeoJSONLayer

加载一个 GeoJSON 文件，自动解析成 Graphic 并渲染。

**什么时候用：** 你的数据是 GeoJSON 格式（最常见的地理数据格式之一）。

```ts
map.add(new GeoJSONLayer({
  url: "/data/boundary.json"
}));
```

## FeatureLayer

加载 ArcGIS FeatureService 的数据，功能上和 GeoJSONLayer 类似，但数据源是 ArcGIS 生态的。

**什么时候用：** 对接 ArcGIS Server 的要素服务。

```ts
map.add(new FeatureLayer({
  url: "https://services.arcgis.com/.../FeatureServer/0"
}));
```

## 一句话总结

| 图层 | 一句话 |
|------|--------|
| TileLayer | 贴瓷砖，做底图 |
| MapImageLayer | 服务端出图，拿来直接显示 |
| GraphicsLayer | 自己加图形，用户交互用 |
| GeoJSONLayer | 加载 GeoJSON 数据 |
| FeatureLayer | 对接 ArcGIS 要素服务 |

选图层的时候，问问自己：数据从哪来？用户要不要交互？——答案出来了，图层也就定了。
