# 里程碑进度

> 交接文档见 [AGENT_HANDOFF.md](./AGENT_HANDOFF.md)。每个里程碑完成后回填状态与验收证据。

## 当前状态：全部交付，v1.0.0（2026-09-08）

86 个管理 API 端点全部处置（78 上线 + 4 显式豁免随整体验收确认 + 1 候选定案为非管理场景）。
质量门终态：`tsc` ✓ / `eslint` ✓ / vitest 88 ✓ / Playwright 23/23（本机真实实例）✓ / `vite build` ✓ / compose 一键演示 ✓。

## 迭代清单（协议制，全部 VERIFIED）

- [ITER-01 视觉风格选型](iterations/ITER-01-visual-style-selection.md)：✅ VERIFIED —— 用户选定：五主题可切换、默认石墨(C)、主布局定稿
- [ITER-02 主题系统与通用基建](iterations/ITER-02-theme-system.md)：✅ VERIFIED —— 两轮验收反馈（顶栏对齐、选中态对比度）均已修复并复验通过；v0.1.0 标记于该完成点
- [ITER-03 应用管理](iterations/ITER-03-apps.md)：✅ VERIFIED —— 三轮验收反馈（布局对齐/危险确认/动画与脏表单）全部修复并复验通过
- [ITER-04 配置管理](iterations/ITER-04-configs.md)：✅ VERIFIED —— 含验收反馈三项修复（面包屑/KV 数组 bug/jsonc 注释）
- [ITER-05 发布链路](iterations/ITER-05-publish.md)：✅ VERIFIED —— 自测代验收全绿；v0.4.0 标记
- [ITER-06 运维视图](iterations/ITER-06-ops.md)：✅ VERIFIED —— v0.5.0 标记；含两轮反馈修复
- [ITER-07 权限体系](iterations/ITER-07-permissions.md)：✅ VERIFIED —— v0.6.0 标记
- [ITER-08 打磨与交付](iterations/ITER-08-delivery.md)：✅ VERIFIED —— 导入导出/环境同步/服务注册/SSO + Docker + compose 一键演示实测；86 端点收口
- 附：发布域整合（历史合并进配置页第四视图 + /apps 待发布徽标，北极星对齐，@2bd11c1）

## 验收后增强（ITER-08 收官后，用户批准/反馈驱动）

- KV/JSON diff 视图四次演进：双 tab 差异面板 → monaco 同步滚动 → 全屏对比 + 工具栏双按钮（对比已保存/对比线上）→ 多级冒号嵌套/数组索引键/整数键保序/空分组键四错位修复（hotel-supplier 759 键实测零差异）；evidence 见 `evidence/ITER-08/`
- C# 验证客户端（tools/verify-client）：配置中心 + 服务注册双演示，三种心跳模式，服务发现 NullReference 修复
- v1.0.0 标记于本完成点

## M0 脚手架 — ✅ 完成（2026-09-04）

DoD 对照：

| 验收标准                                | 证据                                                                                                                                                                                   |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 能登录本机实例拿到 token 并显示当前用户 | Playwright `e2e/auth.spec.ts`（管理员登录用例，绿）：顶栏与概览页显示 admin，角色/权限码来自登录响应；dev 代理 curl 实测 `/admin/jwt/login` → token → `/App/Search` 带 Bearer 返回数据 |
| 未初始化实例能走完 InitPassword 流程    | 临时容器（5018）实测：`PasswordInited:false` → `InitPassword` 成功 → 重复初始化被服务端拒绝（message 透出）→ 新密码登录成功；页面交互由组件单测覆盖（`InitPasswordPage.test.tsx`）     |
| 401 自动跳登录                          | `http.ts` afterResponse 全局拦截：清会话 + 记录来源路由跳转；E2E 用例（伪造 token → 访问 `/` → 清除并跳 `/login?from=%2F`，绿）；单测覆盖信封解包                                      |

质量门：`tsc -b` ✓ / `eslint` 0 警告 ✓ / `vitest` 19 passed ✓ / `playwright` 3 passed ✓

交付内容：Vite7+React18+TS 脚手架、Tailwind 4 设计令牌（§7.1 全量）、ky HTTP 层（Bearer/401/信封）、zustand 会话+全局环境 store、登录页、首启初始化页、布局壳（顶栏+环境切换器+侧栏）、概览页、文案模块 `src/strings/`、E2E 与单测基座。

## M1–M6 里程碑

M1 应用管理 → ITER-03；M2 配置管理 → ITER-04；M3 发布链路 → ITER-05；M4 运维视图 → ITER-06；M5 权限体系 → ITER-07；M6 打磨与交付 → ITER-08。全部随对应迭代 ✅ VERIFIED，证据见各迭代卡与 `evidence/` 目录，不在此重复维护。
