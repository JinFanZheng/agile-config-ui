# ITER-17 H5 移动端适配

> 状态：✅ VERIFIED（原 EVIDENCE_READY，2026-09-08 全页面审计 + 修复 + mobile e2e 回归绿，等待用户验收）。
> 变更分类：小中改（审计驱动的定点修复 + 新增移动端回归）。

## 1. 目标

- G1：390×844 触屏视口下全页面审计（横向溢出/裁切/弹层/抽屉），真问题清零
- G2：`mobile.spec.ts` 移动端回归网（顶栏完整、零页面级溢出、抽屉、inline diff）

## 2. 审计结论（docs/evidence/ITER-17/audit-report.json）

- **真缺陷 1 处**：顶栏 flex 行在移动端总宽超视口，EnvSwitcher（可收缩项）被压至 136px，其内容（DEV+TEST+PROD≈166px）被 `overflow-hidden` 裁切——**PROD 及 TEST 部分不可见不可点**（env 是领域不变量的入口，属高严重度）
- 既定模式确认正常：各列表表格在 `overflow-x-auto` 卡片内横向滚动（页面级溢出恒 0）、配置表格 grid 同、弹窗宽度自适应（369px/401px 视口内）、抽屉正常、登录/指南/设置页零问题
- monaco JSON 视图的 16M 假宽度为其虚拟层内部结构，非缺陷

## 3. 修复

| 修复 | 内容 |
| --- | --- |
| 顶栏裁切 | logo 文字 `<sm` 隐藏（`hidden sm:inline`，图标保留）+ EnvSwitcher `shrink-0`（永不被压缩） |
| Diff 移动端可读性 | 新增 `useMediaQuery` 钩子（matchMedia 响应 + 安全回退，含 3 个单测）；JsonView/KvView 的 DiffEditor 窄屏（<768px）`renderSideBySide:false` 切 inline 单栏，并以 `key={isNarrow?…}` 保证断点翻转重建 |
| e2e 基础设施 | 全量套件三次并行假失败（发布×2、guide×1，隔离均秒过）→ `playwright.config.ts` 限 `workers: 2` |

## 4. 验收记录（2026-09-08）

- 审计：`audit-mobile.mjs`（16 路由 × 溢出检测 + 截图）；修复后 home/kv/settings 越界元素归零，其余 ⚠️ 均为既定滚动模式
- inline diff 判定插曲：`.editor.original` 在 inline 模式仍以 36px 折叠壳存在于 DOM，初次断言选错标记；改用几何断言（original 壳宽 <80px）+ `probe-diff.mjs` 双视口对照（desktop 双栏 455/473 @left 281/782 vs mobile 交错重叠 @left 63/99）
- 新增 `e2e/mobile.spec.ts`（iPhone 12 描述符套 chromium，4 用例）：PROD 完整可见可切换回归、9 关键路由页面级溢出≤0、抽屉分组导航开合、KV 对比 inline
- 门禁：vitest **121**（+3 useMediaQuery）/ e2e **41**（+4 mobile，workers=2 后全量稳定）/ build ✓
- 证据：docs/evidence/ITER-17/（audit 脚本+报告+shots/、probe-diff、capture 脚本）
