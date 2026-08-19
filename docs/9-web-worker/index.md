# 9. Web Worker 并行解析

前几章的例子都是小数据量，主线程同步处理没问题。但真实场景下，一个 GeoJSON 可能有上万条要素、一个要素服务可能有几十万条记录——**解析、格式转换、坐标投影**这些计算如果都跑在主线程上，用户拖拽地图时会明显卡顿。

Web Worker 就是来解决这个问题的：**把重活丢到独立线程，主线程只负责渲染和交互**。

## 思路：worker 里做解析，主线程只做实例化

拿 GeoJSONLayer 举例。改造前，解析链路是这样的：

```
fetch(url)
  → response.json()          // 主线程解析大 JSON，卡！
  → geojsonToArcGIS(...)     // 主线程逐要素转换，卡！
  → new Graphic(...)         // 主线程创建对象
```

改造后，前三步全部移入 worker：

```
主线程                    worker 线程
fetch(url)  ──postMessage──►  fetch + response.json()
                              + geojsonToArcGIS
                              + 投影计算
  ◄──postMessage── 纯数据描述符（GraphicDescriptor[]）
new Graphic(描述符)  // 主线程只做轻量实例化
```

关键点：**postMessage 走的是结构化克隆（structured clone），类实例过不去**。所以 worker 只返回"纯数据描述符"（`{ geometry: {type, longitude/latitude | paths | rings}, attributes }`），主线程再用 `graphicFromDescriptor` 重新实例化 `Graphic` 对象。

## 目录结构

`lib/workers/` 下的文件各司其职：

| 文件 | 职责 |
| --- | --- |
| `types.ts` | 消息协议（请求/响应）与描述符类型，主线程和 worker 共用 |
| `parseDataHandler.ts` | **纯解析逻辑**：fetch、GeoJSON→ArcGIS 转换、Web Mercator 投影。不依赖任何线程 API |
| `parseData.worker.ts` | worker 入口：收到消息 → 调用 handler → 回发结果 |
| `rpcClient.ts` | Promise 化的 RPC 封装：请求带 id，响应按 id 对号入座 |
| `parseDataClient.ts` | 单例客户端：懒创建共享 worker，提供 `requestParseData()` |
| `descriptors.ts` | 描述符 → `Graphic` 的实例化（只在主线程运行） |

## 核心代码

worker 入口（`parseData.worker.ts`）——注意 `self` 被断言成最小接口，避免 DOM lib 和 WebWorker lib 的全局 `self` 类型冲突：

```ts
import { handleParseDataRequest } from "./parseDataHandler";
import type { ParseTask, WorkerRequest, WorkerResponse } from "./types";

const ctx = self as unknown as {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage: (message: WorkerResponse) => void;
};

ctx.onmessage = async (event) => {
  const { id, task, payload } = event.data;
  try {
    const result = await handleParseDataRequest(task as ParseTask, payload);
    ctx.postMessage({ id, ok: true, result });
  } catch (error) {
    ctx.postMessage({
      id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
```

单例客户端（`parseDataClient.ts`）——懒创建共享 worker，**所有图层共用一个 worker**（响应按 id 关联，互不干扰）：

```ts
export async function requestParseData(task, payload) {
  if (typeof Worker === "undefined") {
    // 主线程回退：直接调用纯逻辑，行为一致
    return handleParseDataRequest(task, payload);
  }
  return getClient().request(task, payload);
}
```

## Vite 集成

创建 worker 用的是 Vite 惯用法：

```ts
new Worker(new URL("./parseData.worker.ts", import.meta.url), {
  type: "module",
});
```

- **构建时** Vite 会把 worker 单独打包成一个 chunk（如 `assets/parseData.worker-xxx.js`），并自动改写 URL。
- **库构建**（`vite build`）使用相对 base（`base: "./"`），worker 引用会解析为相对库文件自身的路径，发布到任何 CDN 都能工作；demo 构建仍用 `/mini-arcgis`。

## 收益与边界

- **收益**：上万条要素的解析不再阻塞主线程，拖拽、缩放保持流畅。
- **边界**：worker 之间传递大数据有序列化开销，小数据（几十条）反而可能更慢；所以本项目只对「数据量大、计算重」的图层数据解析用 worker。
