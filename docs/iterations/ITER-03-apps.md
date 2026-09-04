# 迭代卡 ITER-03 - 应用管理（M1）

> 状态：PLANNED（等待用户开工指令；开工时完成 GR-1..10 复审并冻结 baseline）
> 变更分类：中改
> 方案出处：handoff §6 P0 + §10 M1；API 见 [../API_INVENTORY.md](../API_INVENTORY.md)
> 日期：2026-09-04 建卡 / 未开始
> Goal 审查：PENDING（开工复审）
> 当前授权边界：建卡已授权；实现需用户确认 ITER-02 验收并下达开工指令
> 依赖：ITER-02（主题系统）验收通过

## 1. 目标与范围

- 做什么：应用列表（分组视图/搜索/分页/启停状态）、新建（**自动生成 ID**，可改）、编辑、启停、删除（二次确认+危险色）、Secret 查看+一键复制、复制 AppId；新建/编辑可选继承应用；空态引导
- 不做什么：应用导入导出（ITER-08）、应用授权（ITER-07）、配置页（ITER-04）
- 完成定义：E2E 自建应用全链路（创建→编辑→停用→删除）通过；UI 糟点修复（ID 自动生成）可演示；`demo_app` 不被触碰

### 1.1 Goal 定义

| Goal | 用户/系统结果 | Baseline / 当前差距 | Closure rule | Owner |
|---|---|---|---|---|
| G0 | 用户可完成应用全生命周期管理（建/查/改/启停/删/取凭证），ID 由前端自动生成，全链路 E2E 绿 | 无应用管理页（仅侧栏入口+占位页） | E2E `apps.spec.ts` 全链路绿 + 用户验收 | Codex |

### 1.2 API 覆盖（11 端点，详见 API_INVENTORY）

`App/Search`（升级现有调用）、`App/Add`、`App/Edit`、`App/Get`、`App/DisableOrEnable`、`App/Delete`、`App/GetAppGroups`、`App/InheritancedApps`；复用已接：`admin/jwt/login` 等 M0 端点。

## 2. 任务草案

| Task | 内容 | Verify |
|---|---|---|
| T-01 | `api/apps.ts` 补全 11 端点 + 类型（含实测动词确认） | 单测：参数拼装 |
| T-02 | 应用列表页（分组折叠/搜索/分页/待发布徽标占位） | 组件测试 + 截图 |
| T-03 | 新建/编辑弹窗（自动生成 ID、继承应用多选） | 单测 + E2E |
| T-04 | Secret 查看/复制、启停、删除（二次确认） | E2E |
| T-05 | E2E 全链路（e2e_&lt;ts&gt;_app 自建自清）+ 证据 | `docs/evidence/ITER-03/` |

## 3. Release Gates（要点）

RG-1 baseline 冻结；RG-2 全 task GREEN；RG-4 权限码（App_Add 等隐藏无权按钮）；RG-5 L-Real 对本机实例全链路；RG-7 回归（auth/theme e2e 不回归）

## 4. 遗留

无（建卡阶段）
