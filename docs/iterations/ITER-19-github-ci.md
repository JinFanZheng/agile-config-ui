# ITER-19 GitHub 仓库与打包流水线

> 状态：✅ VERIFIED（原 EVIDENCE_READY，2026-09-08 三工作流首轮全绿，等待用户验收）。
> 变更分类：基础设施（无产品代码变更）。

## 1. 交付物

| 件 | 说明 |
| --- | --- |
| GitHub 仓库 `agile-config-ui` | **私有**（默认保守；可随时转公开，反向不可逆），推 main 全历史 |
| fork `dotnetcore/AgileConfig` | 到用户账号（仅追溯/对照用，不改服务端纪律不变） |
| `.github/workflows/ci.yml` | L0+L1：typecheck / lint / vitest / build（含 llms.txt 一致性），dist 产物归档 |
| `.github/workflows/e2e.yml` | L-Real：官方镜像起后端（SQLite + adminConsole，同 compose 演示栈）→ InitPassword → 播种 demo_app（含一次发布，满足发布总览/历史/移动端用例）→ Playwright 全量 |
| `.github/workflows/docker.yml` | buildx 多架构（amd64/arm64）→ ghcr.io/<owner>/agile-config-ui（main/sha/latest + tag 语义化），GHA 缓存 |
| `LICENSE` | MIT（衍生自 dotnetcore/AgileConfig MIT，前端为原创实现） |

## 2. 推送前安全检查

- 历史扫描：`.env.e2e` 从未入库（`git log --all -- .env.e2e` 空）；evidence/skill 文档无真实密码（ITER-11/15 均自检过）；llms 文件有"禁实例地址/凭证"单测。
- CI 密码为一次性实例专用（随建随毁），非任何真实环境凭证。

## 3. 验收记录（2026-09-08）

- YAML 三文件语法校验 ✓；pnpm 钉版与 Dockerfile corepack 一致（9.12.0）
- 仓库 https://github.com/JinFanZheng/agile-config-ui（**2026-09-08 已转公开**，公开前完成业务指纹脱敏 @75068c4：jsonDiff 测试与 C-SHARP-VERIFY 报告中的应用名/键结构通用化）+ fork https://github.com/JinFanZheng/AgileConfig
- 工作流首轮**三条全绿**（CI 34177041853 / E2E 34177041858 / Docker 34177041809），E2E 播种方案一次通过
- 收口调整：Docker 触发改为仅 v* tag + 手动（多架构较重）；进程清理纪律固化进 AGENTS.md（用户要求：测试完关进程）
- 待用户验收：仓库/工作流/GHCR 镜像各看一眼
