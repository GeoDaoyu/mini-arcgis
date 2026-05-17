# Mini-ArcGIS

## 介绍

Mini-ArcGIS是一个蝇量级的ArcGIS实现，旨在帮助学习者理解ArcGIS的工作原理。

> ⚠️该仓库仅是为了学习WebGIS开发，切勿在生产中使用。

## AI 协助

Vibe Coding开发，本仓库由 **Qwen** 和 **DeepSeek** 协助开发。

## 支持的图层类型

- **TileLayer** - ArcGIS切片服务图层
- **MapImageLayer** - ArcGIS动态地图服务图层
- **OpenStreetMapLayer** - OpenStreet切片服务图层
- **GeoJSONLayer** - GeoJSON 图层
- **GraphicsLayer** - 客户端图形图层
- **FeatureLayer** - 要素图层

## 开发

```bash
# 安装依赖
$ pnpm install

# 启动开发服务器（基于文档示例开发库）
$ pnpm start

# 构建库
$ pnpm run build
```

### 文档

```bash
# 启动文档开发服务器
$ pnpm run docs:dev

# 构建文档
$ pnpm run docs:build

# 预览构建后的文档
$ pnpm run docs:preview
```

