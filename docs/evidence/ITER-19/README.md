# ITER-19 证据 — GitHub 仓库 + fork + 打包流水线

## 交付

- 仓库（私有）：https://github.com/JinFanZheng/agile-config-ui（main 全历史推送）
- 后端 fork：https://github.com/JinFanZheng/AgileConfig（仅追溯对照，不改服务端纪律不变）
- 镜像：`ghcr.io/jinfanzheng/agile-config-ui`（首推 tags：main / latest / sha；后续 v* 发语义化版本）

## 工作流首轮（commit b5b07d9，全部一次通过）

| 工作流 | 运行 ID | 结论 | 内容 |
| --- | --- | --- | --- |
| CI | 34177041853 | ✅ success | typecheck / lint / vitest 125+1skip / build（含 llms.txt 一致性）|
| E2E | 34177041858 | ✅ success | 官方镜像后端（SQLite）→ InitPassword → 播种 demo_app（含一次发布）→ Playwright 42/42 |
| Docker | 34177041809 | ✅ success | buildx amd64+arm64 → GHCR（GHA 缓存） |

## 触发策略（收口调整）

CI 与 E2E 跟 push/PR；Docker 改为仅 `v*` tag 与手动触发（多架构构建较重，不随每次 push 跑）。

## 推送前安全检查

`.env.e2e` 从未入库（历史扫描空）；文档/evidence/skill 无真实密码；CI 密码为一次性实例专用。

## 进程纪律（用户要求，已固化进 AGENTS.md）

本机审计：无自动化残留进程（playwright/chromium/自起 webServer 均自清理；现存的 dotnet/node 常驻均为用户 VS Code 扩展进程）。
