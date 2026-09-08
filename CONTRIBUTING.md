# 贡献指南（协作与迭代流程）

> 面向参与本仓库开发的贡献者。环境搭建与命令速查见 [README · 开发指南](README.md#开发指南)，本文专注**流程与约定**。

## 1. 项目红线（先读，违反会被拒）

- **不修改 AgileConfig 服务端**：一切通过 HTTP API 对接（锁定 1.13.2）；新实测 API 结论回写 `docs/AGENT_HANDOFF.md` §5 与 `docs/API_INVENTORY.md`。
- **API 地址一律环境变量**（`VITE_BACKEND_URL`），禁止硬编码；真实凭证只进 gitignore 的 env 文件，**不进代码/文档/提交**。
- **渲染安全**：全项目禁 `dangerouslySetInnerHTML`；配置 value/description、文档代码块一律纯文本渲染。
- **文案**：全部收敛到 `src/strings/`，仅中文。
- **语义不变量**：环境语义色（DEV 绿 / TEST 橙 / PROD 红）与状态语义（待发布=warning、已上线=success、删除/回滚=danger）任何主题下不得变；主题令牌唯一事实源是 `src/index.css` 的 `:root`。
- **交互规范**：新增页面/组件对照 `docs/INTERACTION_GUIDELINES.md` 八章。

## 2. 质量门（提交前自查）

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build   # 常规改动
pnpm e2e                                                  # 涉及页面/流程的改动（需 .env.e2e）
```

E2E 数据纪律：**自建随机前缀应用并在用例内清理；绝不触碰 `demo_app` 等既有数据**；破坏性用例只作用于自建数据。跑完自动化检查不留孤儿 chromium/node 进程。

## 3. 迭代流程（卡制度）

任何中小以上改动先建迭代卡再动代码（小改动至少在 PR 里写清目标/边界/验证）：

1. **建卡**：`docs/iterations/ITER-XX-<slug>.md`（目标与范围 / 任务 / Gate 要点），登记进 `docs/iterations/INDEX.md`；
2. **基线**：动手前跑一次质量门记录基线；
3. **实现与证据**：每项任务的验证证据落 `docs/evidence/ITER-XX/`（脚本可复现优先，截图/逐帧/trace 按需）；
4. **回填**：完成后更新卡（验收记录）与 INDEX 状态；里程碑级同步 `docs/PROGRESS.md`；
5. **状态语义**：`EVIDENCE_READY`（证据齐、待人验收）→ `VERIFIED`（验收通过）。自动化绿 ≠ 验收，需明确验收依据。

完整协议见 `docs/CODEX_GENERAL_ITERATION_PROTOCOL.md`（含 GR 门与事实源优先级）。

## 4. 提交与 PR 约定

- Conventional Commits（`feat:` / `fix:` / `docs:` / `chore:` / `ci:` …，中文描述可）；一个迭代一个或一组语义清晰的提交；
- PR 描述包含：改了什么、为什么、怎么验证的（命令/证据路径）、触碰了哪些红线相关面（API/令牌/交互规范）；
- 发布走 tag：`v*` 触发 GHCR 多架构镜像（见 `.github/workflows/docker.yml`），版本说明写 `CHANGELOG.md` 并建 GitHub Release。

## 5. 文档地图

见 [docs/README.md](docs/README.md)——改到哪类内容就同步哪份事实源，文档不同步视为未完成。
