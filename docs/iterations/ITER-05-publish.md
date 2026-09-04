# 迭代卡 ITER-05 - 发布链路（M3，产品本体）

> 状态：ACTIVE（2026-09-04 开工；baseline @a23475b：typecheck/lint/46 unit/11 e2e 全绿）
> GR 复审：PASS（oracle=M3 DoD E2E 全链路+用户验收；GR-6 回滚 danger 二次确认；GR-8 回退=revert；发布/回滚仅自建应用）
> 变更分类：大改（产品核心价值链：可知/可控/可逆 的落地）
> 方案出处：handoff §0 北极星 + §10 M3 + UX #3/4/11；API 见 [../API_INVENTORY.md](../API_INVENTORY.md)
> 日期：2026-09-04 建卡 / 未开始
> Goal 审查：PENDING（开工复审；大改方案先行）
> 依赖：ITER-04

## 1. 目标与范围

- 做什么：**发布前强制 diff 预览**（新增/修改/删除分组着色，monaco diff 或双栏；数据=Search 的 onlineStatus/editStatus 组合，发布前重新拉取防过期）；发布需填说明（log）；**发布历史时间线**（版本节点：版本号/说明/发布人/时间）；任选两版本 diff（PublishHistory 全量快照对比）；**回滚**（二次确认+明示"回到 vX"+danger 色）；单条配置历史查看
- 不做什么：分批/灰度发布（除非待核实 #4 证实 ids 支持部分发布，否则按能力边界明确放弃）
- 完成定义：E2E 链路"改配置→diff 预览→发布→历史可见→回滚 v1→值恢复"全绿

### 1.1 Goal 定义

| Goal | 用户/系统结果                                                  | Baseline / 当前差距 | Closure rule            | Owner |
| ---- | -------------------------------------------------------------- | ------------------- | ----------------------- | ----- |
| G0   | 用户的每次发布都经过 diff 确认，任意历史版本可查可比可秒级回滚 | 无发布链路          | E2E 全链路绿 + 用户验收 | Codex |

### 1.2 API 覆盖（5 端点，详见 API_INVENTORY）

`Config/Publish`、`Config/PublishHistory`、`Config/Rollback`、`Config/ConfigPublishedHistory`、`Config/WaitPublishStatus`（发布前拉取，复用 ITER-04）

## 2. 任务草案

| Task | 内容                                                                                           | Verify                |
| ---- | ---------------------------------------------------------------------------------------------- | --------------------- |
| T-01 | diff 数据组装（当前编辑态 vs 线上态；版本间快照对比）纯函数 + 单测（含大 value/多行/删除方向） | 单测覆盖 ≥8 场景      |
| T-02 | DiffPreview 组件（monaco diff editor 动态加载，按主题适配）                                    | 组件测试 + 5 主题截图 |
| T-03 | 发布弹窗（diff 强制预览 + log 必填 + 影响面提示位[ITER-06 增强]）                              | E2E                   |
| T-04 | 发布历史时间线 + 版本 diff + 回滚（二次确认）                                                  | E2E                   |
| T-05 | 待核实 #4（ids 部分发布语义）实测定案 → 回写 handoff §12，若不支持则 UI 明确不做分批           | curl 实测记录         |

## 3. Release Gates（要点）

RG-1 baseline；RG-2 GREEN；RG-5 L-Real（真实发布/回滚，自建应用）；RG-6 危险动作（回滚）二次确认 + danger 语义；RG-7 全量回归

## 4. 风险

- monaco diff 的暗/亮主题适配（navy-console 与 4 个亮色主题都要可读）
- 回滚是不可逆动作：确认文案必须明示目标版本与当前版本号
