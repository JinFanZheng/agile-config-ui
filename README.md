# AgileConfig 管理前端（重做版）

> [!NOTE]
> 本项目为独立仓库的全新管理前端，通过 HTTP API 对接 [dotnetcore/AgileConfig](https://github.com/dotnetcore/AgileConfig)（MIT）服务端，不修改服务端、不 fork 服务端。衍生自 dotnetcore/AgileConfig（MIT），同样以 MIT 发布。当前对 **AgileConfig 1.13.2** 开发。

为"配置变更"而生的管理台，不是配置表格 CRUD：diff / 发布 / 回滚是产品本体，应用、节点、用户都是围绕它们的脚手架。设计语言为 Linear 式深色专业风。

## 快速开始

前置：Node 22 LTS + pnpm 9+，以及一个可达的 AgileConfig 服务端（本地 Docker 起一个见[下游](#对接后端)）。

```bash
pnpm install
pnpm dev          # http://localhost:5173
```

开发代理默认指向 `http://localhost:5017`（可用 `.env` 的 `VITE_BACKEND_URL` 覆盖）。首次访问若实例未初始化密码，会引导进入初始化页。

其他命令：

```bash
pnpm typecheck    # tsc -b
pnpm lint         # eslint
pnpm test         # vitest 单测
pnpm e2e          # playwright（复制 .env.e2e.example 为 .env.e2e 填入账号）
pnpm build        # 产物输出 dist/
```

## 对接后端

```bash
docker run -d --name agile_config \
  --platform linux/amd64 \
  -e TZ=Asia/Shanghai -e adminConsole=true \
  -e db__provider=sqlite -e db__conn="Data Source=agile_config.db" \
  -p 5017:5000 kklldog/agile_config:latest
```

- Apple Silicon 必须 `--platform linux/amd64`（默认 arm64 镜像缺 SQLite 原生库）
- 服务端 API 无统一前缀且未开 CORS：开发用 Vite 按路径前缀代理，生产由 nginx 同源反代
- API 地址一律走环境变量 `VITE_API_BASE`（留空 = 同源），禁止硬编码

## 架构

| 层         | 选型                                                    |
| ---------- | ------------------------------------------------------- |
| 构建       | Vite 7 + React 18 + TypeScript                          |
| 路由       | React Router v7                                         |
| 服务端状态 | TanStack Query                                          |
| 客户端状态 | zustand（仅会话 / 当前环境）                            |
| UI         | shadcn/ui 风格自有组件 + Tailwind CSS 4（暗色为主主题） |
| 表单       | react-hook-form + zod                                   |
| HTTP       | ky 薄封装（Bearer 注入、401 全局拦截、信封解包）        |
| 测试       | Vitest（单元）+ Playwright（对本机实例的 E2E）          |

```
src/
  api/          # 按资源分文件（auth, apps, ...），端点真相见 docs/AGENT_HANDOFF.md §5
  components/   # 通用组件（ui/ 为 shadcn 风格基础件）
  features/     # 按页面域组织（auth, home, ...）
  hooks/
  lib/          # http / queryClient / utils
  routes/       # 路由与守卫
  stores/       # zustand：会话、全局环境
  strings/      # 全部界面文案（仅中文，不引入 i18n 框架）
```

## 与官方 UI 的差异

官方 UI（react-ui-antd）是 Ant Design Pro 模板式通用后台；本项目以"配置变更的可知 / 可控 / 可逆"为第一性重新设计信息架构：全局环境切换器、待发布改动全局可见、发布前强制 diff 预览、可视化回滚时间线、虚拟滚动支撑千级配置等。详见 `docs/AGENT_HANDOFF.md`（需求与 API 事实的唯一事实源）与 `docs/PROGRESS.md`（里程碑进度）。

## License

MIT — 衍生自 [dotnetcore/AgileConfig](https://github.com/dotnetcore/AgileConfig)（MIT）。
