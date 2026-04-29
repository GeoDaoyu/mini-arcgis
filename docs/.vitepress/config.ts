import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Mini-Viewer",
  description: "WebGIS 开发学习指南",
  lang: "zh-CN",

  themeConfig: {
    nav: [
      { text: "首页", link: "/" },
      { text: "开始学习", link: "/1-项目搭建/" },
    ],

    sidebar: [
      {
        text: "1. 项目搭建",
        collapsed: false,
        items: [
          { text: "概述", link: "/1-项目搭建/" },
          { text: "前置知识", link: "/1-项目搭建/前置知识" },
          { text: "技术栈", link: "/1-项目搭建/技术栈" },
        ],
      },
      {
        text: "2. MVVM 架构设计",
        collapsed: true,
        items: [
          { text: "概述", link: "/2-mvvm架构设计/" },
          { text: "Map-View 模式", link: "/2-mvvm架构设计/map-view模式" },
          { text: "数据绑定机制", link: "/2-mvvm架构设计/数据绑定机制" },
        ],
      },
      {
        text: "3. 地图投影",
        collapsed: true,
        items: [
          { text: "概述", link: "/3-地图投影/" },
        ],
      },
      {
        text: "4. 要素与图层",
        collapsed: true,
        items: [
          { text: "概述", link: "/4-要素与图层/" },
          { text: "几何要素", link: "/4-要素与图层/几何要素" },
          { text: "图层系统设计", link: "/4-要素与图层/图层系统设计" },
          { text: "图层视图模式", link: "/4-要素与图层/图层视图模式" },
        ],
      },
      {
        text: "5. Canvas 绘制",
        collapsed: true,
        items: [
          { text: "概述", link: "/5-canvas绘制/" },
          { text: "Canvas 基础", link: "/5-canvas绘制/canvas基础" },
          { text: "地图渲染流程", link: "/5-canvas绘制/地图渲染流程" },
          { text: "性能优化", link: "/5-canvas绘制/性能优化" },
        ],
      },
      {
        text: "6. 响应式设计",
        collapsed: true,
        items: [
          { text: "概述", link: "/6-响应式设计/" },
          { text: "地图交互", link: "/6-响应式设计/地图交互" },
          { text: "事件系统", link: "/6-响应式设计/事件系统" },
          { text: "自适应布局", link: "/6-响应式设计/自适应布局" },
        ],
      },
      {
        text: "7. 常见二维图层",
        collapsed: true,
        items: [
          { text: "概述", link: "/7-常见二维图层/" },
          { text: "切片图层", link: "/7-常见二维图层/切片图层" },
          { text: "动态地图图层", link: "/7-常见二维图层/动态地图图层" },
          { text: "GeoJSON 图层", link: "/7-常见二维图层/geojson图层" },
          { text: "图形图层", link: "/7-常见二维图层/图形图层" },
        ],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/geodaoyu/mini-viewer" },
    ],

    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © 2026-present GeoDaoyu",
    },

    editLink: {
      pattern: "https://github.com/geodaoyu/mini-viewer/edit/main/docs/:path",
      text: "在 GitHub 上编辑此页面",
    },

    lastUpdated: {
      text: "最后更新",
      formatOptions: {
        dateStyle: "short",
        timeStyle: "short",
      },
    },

    docFooter: {
      prev: "上一页",
      next: "下一页",
    },

    outline: {
      label: "本页目录",
      level: [2, 3],
    },
  },
});
