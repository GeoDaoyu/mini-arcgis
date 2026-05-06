# 1. 开始

一个 GIS 从业者，借助 AI 从零实现一个 mini 版 ArcGIS JS API 的过程记录。

这不是一个"跟着敲"的教程。关键是理解架构思路和协作方式——你告诉 AI 要什么，AI 帮你写出来，你理解它为什么这么写。

## 背景

我是一个 WebGIS 从业者，2019 年到 2021 年间在 B 站发过一套[《ArcGIS JS API 学习之旅》](https://space.bilibili.com/6100019/lists/1399871?type=season)系列视频。但几年过去了，视频内容大多已经跟不上新版本。

有一种说法我很认同：学会一门技术的最好方式，就是亲手实现它。前端圈有不少成功案例——`mini-react`、`my-promise`，都是通过复刻来学习。

现在正好赶上 Vibe Coding 时代，于是我决定：借助 AI，从零实现一个 mini 版的 ArcGIS JS API。

## 成果展示

在线地址：https://geodaoyu.github.io/mini-arcgis/

目前的进展：

- [x] 图层加载
- [x] 绘制工具
- [ ] 空间分析（测量）

持续迭代中。

## 前置知识

即使有 AI 帮忙写代码，一些基础还是得自己掌握——不然 AI 写的代码你没法判断对不对。

大致上就够了：

- ES6+ 语法——常用特性能看懂
- TypeScript——知道类型怎么写就行
- 前端工程化——npm、打包、构建这些基本概念
- Git 和代码编辑器——日常工具得会用

你不需要精通。碰到拿不准的，让 AI 解释给你听。

## 技术栈

技术栈方面，我选择主流的 **Vite** + **TypeScript**。你只需要告诉 AI：基于 Vite 和 TypeScript 搭建一个类库，它就能自动帮你生成好项目骨架。

由于我还需要编写文档，因此额外引入了 VitePress。

以下是我的文件夹结构：

```
mini-arcgis/
├── lib/                    # 核心库源码
│   ├── main.ts             # 入口，导出公共 API
│   ├── layers/             # 图层（Tile、GeoJSON、Feature 等）
│   ├── views/
│   │   └── layers/         # LayerView，处理各图层渲染逻辑
│   ├── geometry/
│   │   └── support/        # 几何类型 & 投影工具
│   ├── symbols/            # 符号（点、线、面样式）
│   └── renderers/          # 渲染器
├── src/                    # 示例 / Demo 代码
├── docs/                   # VitePress 文档
├── dist/                   # 库构建产物（ESM + UMD）
├── demo/                   # Demo 构建产物
├── vite.config.ts          # 库构建配置
├── vite.config.demo.ts     # Demo 构建配置
└── tsconfig.json
```
