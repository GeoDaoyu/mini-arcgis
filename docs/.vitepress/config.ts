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
        ],
      },
      {
        text: "5. Canvas 绘制",
        collapsed: true,
        items: [
          { text: "概述", link: "/5-canvas绘制/" },
        ],
      },
      {
        text: "6. 常见二维图层",
        collapsed: true,
        items: [
          { text: "概述", link: "/6-常见二维图层/" },
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
