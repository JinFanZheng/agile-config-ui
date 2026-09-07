# 里程碑进度

> 交接文档见 [AGENT_HANDOFF.md](./AGENT_HANDOFF.md)。每个里程碑完成后回填状态与验收证据。

## 当前迭代（协议制）

- [ITER-01 视觉风格选型](iterations/ITER-01-visual-style-selection.md)：✅ VERIFIED —— 用户选定：五主题可切换、默认石墨(C)、主布局定稿
- [ITER-02 主题系统与通用基建](iterations/ITER-02-theme-system.md)：✅ VERIFIED —— 两轮验收反馈（顶栏对齐、选中态对比度）均已修复并复验通过；v0.1.0 标记于该完成点
- [ITER-03 应用管理](iterations/ITER-03-apps.md)：✅ VERIFIED —— 三轮验收反馈（布局对齐/危险确认/动画与脏表单）全部修复并复验通过
- [ITER-04 配置管理](iterations/ITER-04-configs.md)：✅ VERIFIED —— 含验收反馈三项修复（面包屑/KV 数组 bug/jsonc 注释）
- [ITER-05 发布链路](iterations/ITER-05-publish.md)：✅ VERIFIED —— 自测代验收全绿；v0.4.0 标记
- [ITER-06 运维视图](iterations/ITER-06-ops.md)：✅ VERIFIED —— v0.5.0 标记；含两轮反馈修复
- [ITER-07 权限体系](iterations/ITER-07-permissions.md)：✅ VERIFIED —— v0.6.0 标记
- [ITER-08 打磨与交付](iterations/ITER-08-delivery.md)：EVIDENCE_READY —— 导入导出/环境同步/服务注册/SSO + Docker + compose 一键演示实测，E2E 23/23，**86 端点全部处置，等待用户验收收官**
- 附：发布域整合（历史合并进配置页第四视图 + /apps 待发布徽标，北极星对齐，@2bd11c1）
- 迭代路线图见 [iterations/INDEX.md](iterations/INDEX.md)（功能模块逐迭代交付，验收一个继续下一个）

## M0 脚手架 — ✅ 完成（2026-09-04）

DoD 对照：

| 验收标准                                | 证据                                                                                                                                                                                   |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 能登录本机实例拿到 token 并显示当前用户 | Playwright `e2e/auth.spec.ts`（管理员登录用例，绿）：顶栏与概览页显示 admin，角色/权限码来自登录响应；dev 代理 curl 实测 `/admin/jwt/login` → token → `/App/Search` 带 Bearer 返回数据 |
| 未初始化实例能走完 InitPassword 流程    | 临时容器（5018）实测：`PasswordInited:false` → `InitPassword` 成功 → 重复初始化被服务端拒绝（message 透出）→ 新密码登录成功；页面交互由组件单测覆盖（`InitPasswordPage.test.tsx`）     |
| 401 自动跳登录                          | `http.ts` afterResponse 全局拦截：清会话 + 记录来源路由跳转；E2E 用例（伪造 token → 访问 `/` → 清除并跳 `/login?from=%2F`，绿）；单测覆盖信封解包                                      |

质量门：`tsc -b` ✓ / `eslint` 0 警告 ✓ / `vitest` 19 passed ✓ / `playwright` 3 passed ✓

交付内容：Vite7+React18+TS 脚手架、Tailwind 4 设计令牌（§7.1 全量）、ky HTTP 层（Bearer/401/信封）、zustand 会话+全局环境 store、登录页、首启初始化页、布局壳（顶栏+环境切换器+侧栏）、概览页、文案模块 `src/strings/`、E2E 与单测基座。

## M1 应用管理 — ⬜ 未开始

## M2 配置管理 — ⬜ 未开始

## M3 发布链路 — ⬜ 未开始

## M4 运维视图 — ⬜ 未开始

## M5 权限体系 — ⬜ 未开始

## M6 打磨与交付 — ⬜ 未开始
