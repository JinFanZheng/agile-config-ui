# 迭代卡 ITER-08 - 打磨与交付（M6）

> 状态：PLANNED（开工时完成 GR 复审与 baseline 冻结）
> 变更分类：大改（P2 功能聚合 + 部署交付链）
> 方案出处：handoff §6 P2 + §10 M6；API 见 [../API_INVENTORY.md](../API_INVENTORY.md)
> 日期：2026-09-04 建卡 / 未开始
> Goal 审查：PENDING（开工复审）
> 依赖：ITER-03..07 全部完成

## 1. 目标与范围

- 做什么：应用导入导出（Export/PreviewImport/Import，预览校验先行）；JSON 文件上传预览与导出（PreViewJsonFile/ExportJson）；环境间同步（SyncEnv，跨环境 diff 预览+二次确认）；服务注册中心页（Service/Search/Add/Remove）；SSO 登录入口（LoginUrl 显隐 + OidcLoginByCode 回调落地页）；**前端 Docker 镜像**（nginx:alpine + 静态产物 + 同源反代）；docker compose 一键演示（新前端+AgileConfig 后端）；README 终稿（快速开始/架构图/与官方 UI 差异）；全量 E2E 绿
- 不做什么：亮色/暗色自动跟随（Backlog，按需）
- 完成定义：`docker compose up` 一条命令起完整演示并走通核心链路；全量 E2E 绿；README 面向最终用户可照做

### 1.1 Goal 定义

| Goal | 用户/系统结果 | Baseline / 当前差距 | Closure rule | Owner |
|---|---|---|---|---|
| G0 | P2 能力补齐 + 可交付：一条命令跑起完整演示，全部 86 端点处置闭环 | 无导入导出/服务注册/SSO/镜像 | compose 演示 transcript + 全量 E2E + 用户验收 | Codex |

### 1.2 API 覆盖（12 端点，详见 API_INVENTORY）

- App：`Export`、`PreviewImport`、`Import`
- Config：`PreViewJsonFile`、`ExportJson`、`SyncEnv`
- Service：`Search`、`Add`、`Remove`
- SSO：`Index`、`Login`、`LoginUrl`；Admin：`OidcLoginByCode`

> 至此 API_INVENTORY 86 端点全部闭环（4 个显式豁免项需用户确认）。

## 2. 任务草案

| Task | 内容 | Verify |
|---|---|---|
| T-01 | 导入导出三件套（应用 json / 配置 json，预览校验 UI） | E2E（导出→导入 round-trip） |
| T-02 | 环境间同步（选择目标环境 → diff 预览 → 确认同步） | E2E |
| T-03 | 服务注册中心页 | 截图 + E2E |
| T-04 | SSO 入口（LoginUrl 探测显隐；回调路由落地） | 有 OIDC 环境实测或文档化降级 |
| T-05 | Dockerfile（nginx:alpine + 反代配置，前缀清单同 vite 代理）+ compose 演示 | compose up transcript |
| T-06 | README 终稿 + 全量 E2E + 收口审计（对照 API_INVENTORY 逐项回填） | `docs/evidence/ITER-08/` |

## 3. Release Gates（要点）

RG-1 baseline；RG-2 GREEN；RG-3 部署契约（nginx 前缀=API_PREFIXES 清单冻结，与 handoff §7 一致）；RG-5 L-Real（compose 全链路）；RG-7 全量回归；RG-8 治理（API_INVENTORY 回填闭环、README/CHANGELOG）

## 4. 风险

- SSO 无真实 OIDC Provider 时：本地起 Keycloak 测试容器或文档化降级（如实标注证据强度）
- 镜像体积与构建缓存（node 构建层 + nginx 运行层多阶段）
