# 3. 地图投影

## 问题：圆的地球 vs 方的屏幕

地球是个球（严格来说是椭球），但我们的屏幕是平的。想在屏幕上画地图，就必须把球面上的每个点"拍"到平面上。这个过程就叫**投影**。

打个比方：你有一个橘子，想在纸上画出橘子皮的纹路——你得想办法把球面展开成平面。橘子皮不能无损展开，所以无论怎么展，总会有些拉扯变形。地图投影也是一样，不同的投影方式有不同的变形，只是取舍不同。

## 核心：一一对应

投影的本质是一个**数学映射**——球面上的每一个经纬度坐标 `(lng, lat)`，都能唯一对应到平面上的一个像素坐标 `(x, y)`。反过来也是唯一的。

```
球面坐标 (lng, lat)  ←——→  平面坐标 (x, y)
```

这个双向映射必须精确，否则每次缩放、平移地图时，你的点就会"漂移"。

在代码里就是两个函数的事：

```ts
// 经纬度 → 平面像素
function lngLatToXY(lng: number, lat: number): { x: number; y: number }

// 平面像素 → 经纬度
function xyToLngLat(x: number, y: number): { lng: number; lat: number }
```

在 mini-arcgis 中，这两个函数就是 `MapView.toScreen()` 和 `MapView.toMap()`。

## 选什么投影？Web 墨卡托

投影方案有很多种，各有各的用途。在 WebGIS 领域，几乎所有地图服务（Google Maps、百度地图、高德、Mapbox）都用同一种——**Web 墨卡托投影**（EPSG:3857）。

它的优点是：
- 计算简单，性能好
- 角度不变形，街道形状保真
- 全行业通用，各家的瓦片地图都按这个标准切

缺点是高纬度地区面积会被拉大（比如格陵兰岛看起来跟非洲差不多大），但对于我们日常看地图的场景，这完全不是问题。

## 我们怎么做？抄公式

这些投影公式不需要自己推导——前人已经研究得很透彻了，我们直接拿来用就行。

Web 墨卡托的转换公式：

```ts
// 地球半径（Web 墨卡托标准取值）
const R = 6378137;

// 经纬度 → 墨卡托平面（单位：米）
function lngLatToMercator(lng: number, lat: number) {
  const x = (lng * Math.PI) / 180 * R;
  const y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) * R;
  return { x, y };
}

// 墨卡托平面 → 经纬度
function mercatorToLngLat(x: number, y: number) {
  const lng = (x / R) * 180 / Math.PI;
  const lat = (Math.atan(Math.exp(y / R)) * 360 / Math.PI) - 90;
  return { lng, lat };
}
```

然后再把墨卡托的"米"单位映射到屏幕像素，结合当前地图的缩放级别和中心点，就完成了从经纬度到屏幕像素的完整链路。

> 本章的核心要义就这些。如果你感兴趣背后的推导过程，可以搜"墨卡托投影"深入了解。但对写代码来说，知道这两个公式就够了。
