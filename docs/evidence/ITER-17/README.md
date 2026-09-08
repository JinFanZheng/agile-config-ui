# ITER-17 证据 — H5 移动端适配

基线：@b9d84f0。收口后：typecheck ✓ / lint ✓ / vitest **121** / e2e **41**（+4 mobile）/ build ✓。

## 审计（修复前）

`audit-mobile.mjs`：iPhone 12（390×844 触屏）逐 16 路由——页面级横向溢出恒 0；唯一真缺陷：顶栏 EnvSwitcher 被 flex 压缩 + overflow-hidden 裁切（PROD 按钮右缘 409 > 390，`audit-report.json`/`trace-clip.mjs` 祖先链定位）。

## 修复后复审

- 同审计重跑：home/config-kv/settings 越界元素 1→0；其余 ⚠️ 为表格卡片内滚动既定模式（`shots/` 有全部页面前后截图）
- `probe-diff.mjs`：desktop 双栏（455/473px @left 281/782）vs mobile inline 单栏（original 壳折叠 36px、view zone 交错 @left 63/99）——`kv-diff-mobile.png` 留档
- `e2e/mobile.spec.ts` 4 用例全绿（顶栏完整+PROD 可切换 / 9 路由零页面级溢出 / 抽屉分组导航 / inline diff 几何断言）

## 代码变更

顶栏 logo `hidden sm:inline` + EnvSwitcher `shrink-0`；`useMediaQuery`（+3 单测）接入 JsonView/KvView（窄屏 inline diff + key 重建）；playwright `workers: 2`（三次并行假失败实录后的基础设施加固）。
