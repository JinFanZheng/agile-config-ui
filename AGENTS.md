# AGENTS.md — agile-config-ui

AgileConfig 管理前端（独立仓库，对接官方服务端，不修改服务端）。需求、API 事实与已锁定决策的唯一事实源是 [docs/AGENT_HANDOFF.md](docs/AGENT_HANDOFF.md)。

## Iteration Workflow

- Iterations follow [docs/CODEX_GENERAL_ITERATION_PROTOCOL.md](docs/CODEX_GENERAL_ITERATION_PROTOCOL.md).
- Before changing code, run and record the relevant baseline.
- Every medium/large change must have an iteration card under `docs/iterations/` before production code changes.
- Small changes must at least define a result Goal, scope, authorization boundary, verification, and GR-1/3/6/9.
- Medium/large plans must pass GR-1..GR-10 before implementation.
- A plan/review request does not authorize implementation, service restart, release, external messages, or real-data mutation.
- Resume work from the Goal ledger's highest-risk ready task after checking dependencies, authorization, evidence, and git status.
- After every Task, update its evidence, Goal status, remaining gap, blocker, and next ready task in the iteration card and `docs/iterations/INDEX.md`.
- Task completion, code completion, Mock success, or automated tests alone never make a Goal VERIFIED.
- Do not mark an iteration complete until all hard Goals are VERIFIED, all release gates pass, documentation is synchronized, and leftovers have owners and backlog IDs.
- Preserve unrelated user changes; never revert or overwrite them to make the task easier.

## Build And Test

- L0: `pnpm typecheck && pnpm lint && pnpm build`
- L1: `pnpm test`（Vitest 单测）
- L2/L3: 暂无独立层（前端与后端契约经由 L-Real 的 E2E 覆盖；API 事实见 handoff §5）
- L-Real: `pnpm e2e`（Playwright，对本机 AgileConfig 实例 `http://localhost:5017`；凭证放 `.env.e2e`，gitignore）
- L-Full: `pnpm typecheck && pnpm lint && pnpm test && pnpm e2e && pnpm build`

## 架构红线

- 不修改 AgileConfig 服务端；一切需求通过 HTTP API 实现（handoff D5）
- API 锁定 1.13.2；端点事实以 handoff §5 为准，新实测结论必须回写
- API 地址一律走环境变量（`VITE_API_BASE` / `VITE_BACKEND_URL`），禁止硬编码
- 凭证纪律：真实密码只放 gitignore 的 env 文件，文档与测试夹具不落真实密码
- 渲染安全：全项目禁止 `dangerouslySetInnerHTML`；配置 value/description 按纯文本渲染
- 界面文案全部收敛到 `src/strings/`，仅中文，不引入 i18n 框架
- **交互规范**（动效/危险确认/脏表单保护/反馈/空态/键盘/列表/令牌 八章）见 `docs/INTERACTION_GUIDELINES.md`，新页面与组件必须遵守，评审逐条对照
- 环境语义色（DEV 绿 / TEST 橙 / PROD 红）与状态语义（待发布=warning、已上线=success、删除/回滚=danger）是领域不变量，任何视觉风格下语义不得变（handoff §0/§7.1）
- 设计令牌唯一事实源：`src/index.css` 的 `:root`；令牌变更必须同步事实源文档
- 服务端状态一律 TanStack Query；zustand 仅存会话与全局环境
- E2E 数据纪律：自建随机前缀应用并在 afterAll 清理；禁止动 `demo_app`

## 事实源清单

| 事实源                       | 路径                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| 需求 / API 事实 / 已锁定决策 | `docs/AGENT_HANDOFF.md`                                                               |
| API 全量清单与迭代映射       | `docs/API_INVENTORY.md`（86 端点；全部适配约束，豁免需用户确认）                      |
| 迭代总表（WIP / 索引）       | `docs/iterations/INDEX.md`                                                            |
| 迭代卡                       | `docs/iterations/ITER-*.md`                                                           |
| Evidence                     | `docs/evidence/<ITER-ID>/`                                                            |
| 里程碑进度                   | `docs/PROGRESS.md`                                                                    |
| 设计风格静态稿               | `design/previews/`（伺服：`python3 -m http.server 5019 --directory design/previews`） |

## 优先级

```text
AGENTS.md 项目级硬约束
  > 已冻结契约与安全不变量
  > 当前迭代卡 Goal / Gate / 授权边界
  > Task 说明与临时记录
  > 聊天中的非持久共识
```
