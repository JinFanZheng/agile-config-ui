# docs 文档地图

> 哪份文档是什么、给谁看、什么时候必须同步。原则：**每类事实只有一个事实源，改到就同步**；优先级为 `AGENTS.md` > 已冻结契约 > 当前迭代卡 > 聊天共识。

## 面向使用者 / 接入方

| 文档 | 内容 | 读者 |
| --- | --- | --- |
| [README](../README.md) | 项目定位、快速开始（compose/源码）、架构、代理契约、开发指南 | 所有人 |
| [USER_GUIDE](USER_GUIDE.md) | 管理台使用指南（核心概念、发布路径、设置、FAQ） | 管理员 |
| 管理台「接入指南」(`/guide`) | 客户端接入六节（快速开始/C# SDK/依赖注入/服务注册/实测坑位/FAQ） | 接入方开发者 |
| `/llms.txt` · `/llms-full.txt` | 接入指南同源导出，AI 编码助手可抓取（`pnpm gen:llms` 重新生成） | AI / 自动化 |

## 面向贡献者

| 文档 | 内容 | 何时同步 |
| --- | --- | --- |
| [CONTRIBUTING](../CONTRIBUTING.md) | 协作与迭代流程、红线、质量门、PR 约定 | 流程/约定变化时 |
| [INTERACTION_GUIDELINES](INTERACTION_GUIDELINES.md) | 交互规范八章（动效/危险确认/脏表单/反馈/空态/键盘/列表/令牌） | 新增交互模式时 |
| [AGENT_HANDOFF](AGENT_HANDOFF.md) | 需求 / API 实测事实 / 已锁定决策（含 §7.0 SSO、§7.1 设计语言） | **新实测 API 结论必须回写** |
| [API_INVENTORY](API_INVENTORY.md) | 86 管理端点全量清单与迭代映射 | 端点适配变化时 |

## 过程记录（只增不改历史）

| 文档 | 内容 |
| --- | --- |
| [PROGRESS](PROGRESS.md) | 里程碑进度与各版本收口状态 |
| [iterations/INDEX](iterations/INDEX.md) | 迭代总表（WIP / 路线图 / 状态） |
| [iterations/ITER-*.md](iterations/) | 迭代卡（目标/任务/Gate/验收记录） |
| [evidence/](evidence/) | 每迭代的验证证据（脚本/截图/逐帧/报告） |
| [BACKLOG](BACKLOG.md) | 不阻断当前迭代的欠账与候选 |

## 内部工作文档（AI 协作向，随仓库公开保留）

| 文档 | 内容 |
| --- | --- |
| [AGENTS.md](../AGENTS.md) | AI 代理工作约束（红线/构建/事实源/优先级），对人类贡献者同样适用 |
| [CODEX_GENERAL_ITERATION_PROTOCOL](CODEX_GENERAL_ITERATION_PROTOCOL.md) | 迭代协议全文（GR 门、Goal 语义、恢复流程） |

## 部署与运维

| 文档 | 内容 |
| --- | --- |
| [../docker-compose.yml](../docker-compose.yml) | 源码构建演示栈（SQLite） |
| [../docker-compose.image.yml](../docker-compose.image.yml) | 镜像版演示栈（免克隆，数据库可参数化） |
| [../docker-compose.mysql.yml](../docker-compose.mysql.yml) | MySQL 叠加层 |
| [../scripts/sso-test.sh](../scripts/sso-test.sh) | SSO 一键测试（Keycloak，up/test/down） |
