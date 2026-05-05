import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Mini-ArcGIS",
  description: "WebGIS 开发学习指南",
  lang: "zh-CN",

  themeConfig: {
    nav: [
      { text: "首页", link: "/" },
      { text: "开始学习", link: "/1-getting-started/" },
    ],

    sidebar: [
      { text: "1. 项目搭建", link: "/1-getting-started/" },
      { text: "2. MVVM 架构设计", link: "/2-mvvm-architecture/" },
      { text: "3. 地图投影", link: "/3-map-projection/" },
      { text: "4. 要素与图层", link: "/4-features-and-layers/" },
      { text: "5. Canvas 绘制", link: "/5-canvas-rendering/" },
      { text: "6. 常见二维图层", link: "/6-common-layer-types/" },
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
