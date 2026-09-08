# 迭代总表

> 遵循 [../CODEX_GENERAL_ITERATION_PROTOCOL.md](../CODEX_GENERAL_ITERATION_PROTOCOL.md)。新会话恢复顺序：AGENTS.md → 本表 → 当前迭代卡 → next ready task → Evidence → `git status`。
> **API 全量适配约束**：管理面 86 端点的清点与逐迭代映射见 [../API_INVENTORY.md](../API_INVENTORY.md)（用户要求：全部适配，豁免需确认）。

## 当前 WIP

| 迭代                              | 标题           | 状态   | 最高风险 next ready task   |
| --------------------------------- | -------------- | ------ | -------------------------- |
| [ITER-09](ITER-09-settings.md) | 设置中心与防闪屏修复 | ✅ VERIFIED | 已验收（设置页档位 + FOUC 逐帧证据） |
| [ITER-10](ITER-10-integration-guide.md) | 接入指南（网页直出） | ✅ VERIFIED | 已验收（五节内容 + 复制交互） |
| [ITER-11](ITER-11-agent-skill.md) | Agent 运维 Skill | ✅ VERIFIED | 已验收（skill 触发一次实操） |
| [ITER-12](ITER-12-themes.md) | 盲盒皮肤×5（十主题） | ✅ VERIFIED | 已验收（十主题逐个过目） |
| [ITER-13](ITER-13-themes-polish.md) | 主题打磨：基线对比度+浅/深分组+跟随系统 | ✅ VERIFIED | 已验收（新观感/分组/跟随系统） |
| [ITER-14](ITER-14-theme-settings.md) | 设置页主题区重排+跟随系统映射可配置 | ✅ VERIFIED | 已验收（新布局/映射下拉） |
| [ITER-15](ITER-15-guide-di.md) | 接入指南：依赖注入与 IConfiguration 节 | ✅ VERIFIED | 已验收（/guide 新节） |
| [ITER-16](ITER-16-nav-groups.md) | 侧栏导航分组 | ✅ VERIFIED | 已验收（分组观感与命名） |
| [ITER-17](ITER-17-mobile.md) | H5 移动端适配 | ✅ VERIFIED | 已验收（手机宽度过一遍） |
| [ITER-18](ITER-18-llms.md) | llms.txt AI 接入入口 | ✅ VERIFIED | 已验收（浏览器/Agent 各取一次） |
| [ITER-19](ITER-19-github-ci.md) | GitHub 仓库+fork+打包流水线 | ✅ VERIFIED | 已验收（仓库/工作流/镜像） |
| [ITER-20](ITER-20-real-stack.md) | 真实栈实测（MySQL）+生产崩溃修复 | ✅ VERIFIED | 已验收（5173 栈过一遍） |
| [ITER-21](ITER-21-route-error.md) | 路由错误页+过期 chunk 自愈 | ✅ VERIFIED | 已验收（硬刷新后过一遍） |
| [ITER-22](ITER-22-settings-batch3.md) | 设置第三批：默认视图+自动换行 | ✅ VERIFIED | 用户验收（/settings 两行新设置） |
| [ITER-23](ITER-23-e2e-flake.md) | e2e 抗抖 | ✅ VERIFIED | — |
| [ITER-24](ITER-24-ux-batch.md) | 体验小项（折叠/落地页/分页/指南全宽） | ✅ VERIFIED | 用户验收（折叠/设置三行/指南） |
| [ITER-25](ITER-25-sso.md) | SSO 补全（回调落地+文案+Keycloak 实测） | ✅ VERIFIED | 用户验收（SSO 配置文档/handoff §7.0） |
| [ITER-26](ITER-26-docs.md) | 公开仓库文档补全（指南×3+导航） | ✅ VERIFIED | 用户验收（三份新文档） |
| [ITER-27](ITER-27-install.md) | 一键安装脚本（引导配置） | ✅ VERIFIED | 用户验收（本机跑一遍 install.sh） |
| [ITER-28](ITER-28-external-db.md) | install.sh 外部 MySQL+鲁棒性 | ✅ VERIFIED | 用户验收（外部库装一遍） |
| [ITER-29](ITER-29-install-ci.md) | install.sh Linux CI 矩阵+模板语义定案 | ✅ VERIFIED | 用户验收（Actions 首轮三绿） |

## 迭代路线图（2026-09-04 与用户约定：逐迭代交付，验收一个再继续；跨模块独立页用子代理并行）

| ID      | 标题                                                             | 对应里程碑 | API 端点 | 状态        | 卡片                                                                   | Evidence                 |
| ------- | ---------------------------------------------------------------- | ---------- | -------- | ----------- | ---------------------------------------------------------------------- | ------------------------ |
| ITER-01 | 视觉风格选型                                                     | —          | —        | ✅ VERIFIED | [ITER-01-visual-style-selection.md](ITER-01-visual-style-selection.md) | `docs/evidence/ITER-01/` |
| ITER-02 | 主题系统与通用基建                                               | M0 增量    | —        | ✅ VERIFIED | [ITER-02-theme-system.md](ITER-02-theme-system.md)                     | `docs/evidence/ITER-02/` |
| ITER-03 | 应用管理                                                         | M1         | 11       | ACTIVE      | [ITER-03-apps.md](ITER-03-apps.md)                                     | —                        |
| ITER-04 | 配置管理（三视图/徽标/虚拟滚动/继承）                            | M2         | 15       | PLANNED     | [ITER-04-configs.md](ITER-04-configs.md)                               | —                        |
| ITER-05 | 发布链路（diff/发布/时间线/回滚——产品本体）                      | M3         | 5        | PLANNED     | [ITER-05-publish.md](ITER-05-publish.md)                               | —                        |
| ITER-06 | 运维视图（概览/客户端一致性/节点/日志/远程操作；**子代理并行**） | M4         | 22       | PLANNED     | [ITER-06-ops.md](ITER-06-ops.md)                                       | —                        |
| ITER-07 | 权限体系（用户/角色/应用授权/按钮级权限）                        | M5         | 13       | PLANNED     | [ITER-07-permissions.md](ITER-07-permissions.md)                       | —                        |
| ITER-08 | 打磨与交付（导入导出/环境同步/服务注册/SSO/Docker）              | M6         | 12       | ✅ VERIFIED | [ITER-08-delivery.md](ITER-08-delivery.md)                             | `docs/evidence/ITER-08/` |
| ITER-09 | 设置中心与防闪屏修复（浏览器本地个性化）                          | —          | 0        | ✅ VERIFIED | [ITER-09-settings.md](ITER-09-settings.md) | `docs/evidence/ITER-09/` |
| ITER-10 | 接入指南（产品内文档页，网页直出 TSX）                            | —          | 0        | ✅ VERIFIED | [ITER-10-integration-guide.md](ITER-10-integration-guide.md) | `docs/evidence/ITER-10/` |
| ITER-11 | Agent 运维 Skill（agileconfig-ops）                              | —          | 0        | ✅ VERIFIED | [ITER-11-agent-skill.md](ITER-11-agent-skill.md) | `docs/evidence/ITER-11/` |
| ITER-12 | 盲盒皮肤×5（曜石/紫夜/樱粉/摩卡/森夜，共十主题）                | —          | 0        | ✅ VERIFIED | [ITER-12-themes.md](ITER-12-themes.md) | `docs/evidence/ITER-12/` |
| ITER-13 | 主题打磨：基线对比度优化 + 浅/深分组 + 跟随系统                | —          | 0        | ✅ VERIFIED | [ITER-13-themes-polish.md](ITER-13-themes-polish.md) | `docs/evidence/ITER-13/` |
| ITER-14 | 设置页主题区重排 + 跟随系统深浅映射可配置                      | —          | 0        | ✅ VERIFIED | [ITER-14-theme-settings.md](ITER-14-theme-settings.md) | `docs/evidence/ITER-14/` |
| ITER-15 | 接入指南：依赖注入与 IConfiguration 集成节（实测驱动）          | —          | 0        | ✅ VERIFIED | [ITER-15-guide-di.md](ITER-15-guide-di.md) | `docs/evidence/ITER-15/` |
| ITER-16 | 侧栏导航分组（配置管理/运维监控/权限管理，空组隐藏）          | —          | 0        | ✅ VERIFIED | [ITER-16-nav-groups.md](ITER-16-nav-groups.md) | `docs/evidence/ITER-16/` |
| ITER-17 | H5 移动端适配（顶栏裁切修复/inline diff/mobile e2e）         | —          | 0        | ✅ VERIFIED | [ITER-17-mobile.md](ITER-17-mobile.md) | `docs/evidence/ITER-17/` |
| ITER-18 | llms.txt / llms-full.txt（AI 助手接入入口，与指南同源生成） | —          | 0        | ✅ VERIFIED | [ITER-18-llms.md](ITER-18-llms.md) | `docs/evidence/ITER-18/` |
| ITER-19 | GitHub 仓库 + fork 后端 + CI/E2E/GHCR 流水线                    | —          | —        | ✅ VERIFIED | [ITER-19-github-ci.md](ITER-19-github-ci.md) | `docs/evidence/ITER-19/` |
| ITER-20 | MySQL 真实栈实测；lightningcss #fff→monaco 生产崩溃修复+哨兵 | —          | 0        | ✅ VERIFIED | [ITER-20-real-stack.md](ITER-20-real-stack.md) | `docs/evidence/ITER-20/` |
| ITER-21 | 路由错误页（中文）+ 过期 chunk 自动刷新自愈                  | —          | 0        | ✅ VERIFIED | [ITER-21-route-error.md](ITER-21-route-error.md) | `docs/evidence/ITER-21/` |
| ITER-22 | 设置第三批：配置页默认视图 + 编辑器自动换行                    | —          | 0        | ✅ VERIFIED | [ITER-22-settings-batch3.md](ITER-22-settings-batch3.md) | `docs/evidence/ITER-22/` |
| ITER-23 | e2e 抗抖（retries 全环境统一，双轮+三轮全绿零 flaky）            | —          | —        | ✅ VERIFIED | [ITER-23-e2e-flake.md](ITER-23-e2e-flake.md) | — |
| ITER-24 | 体验小项：侧栏折叠/登录落地页/分页大小/指南全宽                    | —          | 0        | ✅ VERIFIED | [ITER-24-ux-batch.md](ITER-24-ux-batch.md) | `docs/evidence/ITER-24/` |
| ITER-25 | SSO 补全：OIDC 回调落地 + ssoButtonText + Keycloak 端到端实测 | —          | 1        | ✅ VERIFIED | [ITER-25-sso.md](ITER-25-sso.md) | `docs/evidence/ITER-25/` |
| ITER-26 | 公开仓库文档补全：用户指南/贡献指南/文档地图                    | —          | 0        | ✅ VERIFIED | [ITER-26-docs.md](ITER-26-docs.md) | — |
| ITER-27 | 一键安装脚本 install.sh（引导配置 + status/upgrade/uninstall）| —          | 0        | ✅ VERIFIED | [ITER-27-install.md](ITER-27-install.md) | — |
| ITER-28 | install.sh 外部 MySQL 与鲁棒性（预检/建库/转义/诊断）    | —          | 0        | ✅ VERIFIED | [ITER-28-external-db.md](ITER-28-external-db.md) | — |
| ITER-29 | install.sh Linux CI 矩阵 + 模板升级语义定案                | —          | —        | ✅ VERIFIED | [ITER-29-install-ci.md](ITER-29-install-ci.md) | — |

> 覆盖核对：M0 已适配 3 + ITER-03..08 共 78（含 Search 归 03、WaitPublishStatus 归 04、发布共用）+ 显式豁免 4（`Admin/Logoff`、`Home/IndexAsync`、`Home/Echo`、`Home/GetIP`；另有 `RemoteOP/RegisterNode` 待 ITER-06 定案）= 86 ✓。豁免需用户确认，见 API_INVENTORY 文末。

## 历史变更（协议采用前）

| 时间       | 内容                                        | 记录                                                                                                                               |
| ---------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-04 | M0 脚手架（登录/首启/401/布局壳），DoD 全过 | [../PROGRESS.md](../PROGRESS.md)，commits 8b2e779..7f35f10。M0 所用 Linear 暗色风格已被用户否决并升级为多主题体系（见 ITER-01/02） |
