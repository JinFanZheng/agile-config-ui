# ITER-21 证据 — 路由错误页（用户实测反馈）

## 现场

用户浏览器截图（user-report-crash.png）：React Router 英文默认错误页 —— `Failed to fetch dynamically imported module: http://localhost:5173/assets/KvView-Dv4bh2Jb.js`。

## 根因

ITER-20 修复中重建了前端镜像 → 资产 hash 更新（实证：旧 `KvView-Dv4bh2Jb.js` 404，现构建为 `KvView-CB6UqZ1_.js`）→ 用户已打开的旧标签页持旧 index.html，懒加载旧 chunk 404 → 无自定义 errorElement → 露出英文默认页（违反全中文文案纪律）。

## 修复

- `src/routes/RouterErrorPage.tsx`：中文错误页三分支（应用已更新/404/意外错误），过期 chunk **自动整页刷新一次**（sessionStorage 10s 防循环）；接线三个顶层路由 errorElement；文案入 strings/common。
- 单测 ×2（createMemoryRouter 驱动，与生产 createBrowserRouter 同为数据路由器——声明式 Routes 不接 errorElement 是关键坑）；e2e `chunk-error.spec.ts`（拦截 KvView 模拟旧 chunk 404：中文错误页 + 恰好一次自动刷新不循环 + 无英文默认页）。
- 过程自坑记录：e2e 用 addInitScript 清防抖标记导致每次 reload 后标记被清成循环——改为登录后一次性清除。

## 门禁

vitest **129**；nginx 真实产物全量 e2e **43/43**（含新用例）；一次首跑 42+1 疑似竞态，复跑两次全绿。
