# ITER-20 真实栈实测（MySQL）与生产崩溃修复

> 状态：验收中（EVIDENCE_READY，2026-09-08 本地 MySQL 真实栈全量 e2e 42/42 + 生产哨兵 3/3，等待用户验收）。
> 需求出处：用户指示"本地启动服务做真实测试，原来的清理掉，本地有 mysql（可用 docker 的）"。

## 1. 数据库支持（后端源码实证：ProviderToFreesqlDbType）

`db__provider` 支持 **sqlite / mysql / sqlserver / npgsql|postgresql|pg / oracle**（FreeSql）。本机 ServBay 为 MariaDB（兼容 mysql），按用户指示改用 docker mysql:8.4。

## 2. 交付物

| 件 | 说明 |
| --- | --- |
| `docker-compose.image.yml` 参数化 | `DB_PROVIDER`/`DB_CONN` 可覆盖（默认 sqlite 行为不变），配合 GHCR 镜像免克隆部署 |
| `docker-compose.mysql.yml` | MySQL 版完整栈叠加层：mysql:8.4（MYSQL_DATABASE 自动建库 + healthcheck）+ 后端 `db__provider=mysql`（表由 CodeFirst EnsureTables 自动建） |
| **生产崩溃修复** | lightningcss 生产压缩 `#ffffff→#fff` → monaco 把 `editor.background` 降级为 token 规则（只认 6 位 hex）→ `defineTheme` 抛错 → React Router ErrorBoundary 整页白屏。修复：`lib/color.ts` `expandHex6()` 统一展开（monaco.ts 全部颜色过此函数），+2 单测 |
| `e2e/preview.spec.ts` | 生产产物哨兵（PREVIEW_BASE_URL 门控）：应用壳渲染 / KV+JSON+monaco 挂载（本次崩溃哨兵）/ llms.txt charset——补上"dev 不压缩、常规 e2e 盲区" |
| CI E2E 工作流扩展 | e2e 后追加 vite preview 冒烟段（build + preview + 哨兵用例） |

## 3. 实测记录（2026-09-08，本机 OrbStack）

- 清理本项目旧 docker 资源（残留 `agile_config` 容器等；未触碰其他项目 21 个容器）
- MySQL 栈 `up -d --build`：mysql healthy → 后端 1.13.2 启动 → `agc_*` 12 表自动建（SHOW TABLES 实证）→ 前端 nginx 200，llms.txt `charset=utf-8`（生产 nginx 实证）
- 初始化密码 + 播种 demo_app（发布 v1；MySQL 计数实证 apps=1/configs=2）
- 修复前：全量 e2e 36 过 / 1 挂（mobile KV）+3 串行未跑——探针捕获 `Illegal value for token color: #fff` 页面级崩溃
- 修复后（重建镜像）：**42/42 + 哨兵 3/3**
- 过程发现并解决：重启后 shell Node 回落到 16（nvm PATH 显式升 22）

## 4. 验收方式

栈在跑：前端 http://localhost:5173（admin / demo-stack-2026），后端 5017（MySQL）。收工命令：
`docker compose -f docker-compose.yml -f docker-compose.mysql.yml down -v --remove-orphans`
