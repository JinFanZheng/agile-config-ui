# AgileConfig 管理前端

为 [dotnetcore/AgileConfig](https://github.com/dotnetcore/AgileConfig)（MIT）打造的全新管理前端：以「配置变更的可知 / 可控 / 可逆」为第一性，diff / 发布 / 回滚是产品本体，应用、节点、用户都是围绕它们的脚手架。独立仓库，仅通过 HTTP API 对接官方服务端（不修改、不 fork 服务端），当前对 **AgileConfig 1.13.2** 开发。

## 与官方 UI 的差异

官方 UI（react-ui-antd）是 Ant Design Pro 模板式通用后台；本项目重新设计了信息架构：

- **多主题体系**：石墨（默认）/ 晨雾蓝 / 暖纸 / 深蓝中控 / 薄荷 / 曜石 / 紫夜 / 樱粉 / 摩卡 / 森夜十套主题（5 浅 + 5 深）即时切换、持久化，另有「跟随系统」档（系统深浅映射可自定义）；无论怎么切，环境语义色（DEV 绿 / TEST 橙 / PROD 红）与状态语义（待发布=warning、已上线=success、删除/回滚=danger）恒定不变，十套主题全部通过 WCAG 对比度与色相不变量断言。
- **发布链路体验**：全局环境切换器常驻顶栏；待发布改动在应用列表与配置页全局可见（新增/修改/删除三色计数）；发布前强制 diff 预览并填写发布说明；发布历史以时间线呈现，任选两个版本可 diff，回滚二次确认。
- **权限体系**：按当前用户权限码做按钮级隐藏/禁用，无权操作不出现在界面上。
- **设置中心**：浏览器本地个性化（主题/界面字号/编辑器字号/动效），即时生效 + 持久化 + 防闪屏；**接入指南**：产品内开发者文档页（快速开始 / C# SDK / 依赖注入与 IConfiguration / 服务注册 / 实测坑位 / FAQ，代码一键复制，全部结论实测验证）；同源生成站点根 /llms.txt 与 /llms-full.txt，AI 编码助手可直接抓取完成接入。
- **移动端适配**：手机宽度可用（顶栏/抽屉/inline diff 自适应），有专项移动端 E2E 回归。
- 其他：千级配置虚拟滚动、group 分组折叠、批量操作、创建应用自动生成 ID、一键复制 AppId/Secret、侧栏分组导航、全中文界面。

## 快速开始

### 方式零：一行命令安装（推荐）

```bash
curl -fsSL https://raw.githubusercontent.com/JinFanZheng/agile-config-ui/main/scripts/install.sh | bash
```

默认配置即装即用（端口 8080 / sqlite / 数据卷持久化），装完**打开 http://localhost:8080 完成首启**：页面会引导你设置 admin 密码。其余都是配置，按需追加：

```bash
# 带参数（外部 MySQL + 自定端口 + 预设管理员密码）
curl -fsSL https://raw.githubusercontent.com/JinFanZheng/agile-config-ui/main/scripts/install.sh | bash -s -- --port 9000 --db mysql   --mysql-host host.docker.internal --mysql-pass '你的密码' --admin-pass '管理密码'
# 交互引导（端口/数据库/密码/SSO 逐项问）→ 两步下载后运行
curl -fsSL https://raw.githubusercontent.com/JinFanZheng/agile-config-ui/main/scripts/install.sh -o install.sh && chmod +x install.sh && ./install.sh
# 日常（status/upgrade/uninstall 同样一行）
curl -fsSL https://raw.githubusercontent.com/JinFanZheng/agile-config-ui/main/scripts/install.sh | bash -s -- status
curl -fsSL https://raw.githubusercontent.com/JinFanZheng/agile-config-ui/main/scripts/install.sh | bash -s -- upgrade
curl -fsSL https://raw.githubusercontent.com/JinFanZheng/agile-config-ui/main/scripts/install.sh | bash -s -- uninstall --yes
```

能力一览：MySQL 自带容器或**外部实例**（装前自动预检连通/认证/建库，特殊字符密码转义）；SSO 装时配或后补（编辑 `<dir>/.env` 后 `upgrade`）；backend 不对外只走同源反代。注意：`upgrade` 更新镜像并使 `.env` 生效，但**不重写 compose 模板**——脚本模板更新后需备份 `.env` 重新 install。全部参数见 `--help`。

### 方式一：Docker Compose 一条命令（推荐体验完整栈）

```bash
docker compose up -d --build
```

- 前端：<http://localhost:5173>（nginx 静态托管 + 同源反代）
- 后端：<http://localhost:5017>（官方 AgileConfig，SQLite）

**首次启动**：浏览器打开 <http://localhost:5173>，若实例尚未初始化密码，前端会引导进入「初始化密码」页设置 admin 密码，之后正常登录（也可直接访问 5017 用官方 adminConsole 初始化）。

注意：这是**演示栈**，数据不持久——backend 未挂载数据卷，`docker compose down -v` 后数据清空；生产使用请自行持久化数据库并按下方「部署形态」反代。

### 方式二：源码运行（开发）

前置：Node 22 LTS + pnpm 9+（`corepack enable` 即可），以及一个可达的 AgileConfig 服务端（没有就用方式一起 backend：`docker compose up -d backend`）。

```bash
pnpm install
pnpm dev          # http://localhost:5173
```

开发代理默认指向 `http://localhost:5017`，可用 `.env` 的 `VITE_BACKEND_URL` 覆盖。首次访问若实例未初始化密码，会引导进入初始化页。

生产构建产物输出 `dist/`，由 nginx 静态托管并同源反代（`Dockerfile` + `nginx.conf` 已配好，构建一个前端镜像即可部署）。

## 架构

### 技术栈

| 层         | 选型                                                    |
| ---------- | ------------------------------------------------------- |
| 构建       | Vite 7 + React 18 + TypeScript                          |
| 路由       | React Router v7                                         |
| 服务端状态 | TanStack Query                                          |
| 客户端状态 | zustand（仅会话 / 当前环境）                            |
| UI         | shadcn/ui 风格自有组件 + Tailwind CSS 4（十主题+跟随系统引擎）   |
| 表单       | react-hook-form + zod                                   |
| HTTP       | ky 薄封装（Bearer 注入、401 全局拦截、信封解包）        |
| 测试       | Vitest（单元）+ Playwright（对本机实例的 E2E）          |

### 代理规则（部署契约）

AgileConfig 服务端 API **没有统一前缀**且未开 CORS，前端按控制器路径前缀同源反代；dev 由 Vite 代理、生产由 nginx 反代，前缀清单同源（改动须同步 `vite.config.ts` 的 `API_PREFIXES` 与 `nginx.conf`）：

| 路径前缀        | 控制器域       | dev（Vite proxy → `VITE_BACKEND_URL`） | 生产（nginx → `BACKEND`） |
| --------------- | -------------- | -------------------------------------- | ------------------------- |
| `/App`          | 应用           | 代理                                   | 反代                      |
| `/Config`       | 配置           | 代理                                   | 反代                      |
| `/Admin` `/admin` | 管理员/登录  | 代理                                   | 反代                      |
| `/User`         | 用户           | 代理                                   | 反代                      |
| `/Role`         | 角色           | 代理                                   | 反代                      |
| `/ServerNode`   | 节点           | 代理                                   | 反代                      |
| `/Service`      | 服务注册中心   | 代理                                   | 反代                      |
| `/SysLog`       | 系统日志       | 代理                                   | 反代                      |
| `/SSO`          | 单点登录       | 代理                                   | 反代                      |
| `/Report`       | 报表/首页统计  | 代理                                   | 反代                      |
| `/Home`         | 首页看板       | 代理                                   | 反代                      |
| `/RemoteOP`     | 客户端运维指令 | 代理                                   | 反代                      |
| `/RemoteServerProxy` | 节点代理运维 | 代理                                | 反代                      |

其余路径一律走前端（生产 nginx `try_files ... /index.html` 做 SPA fallback）。nginx 侧用单条不区分大小写的正则 location 覆盖大小写两套（登录走小写 `/admin/jwt/login`、管理走 `/Admin/*`），并以 `(/|$)` 锚定边界避免误伤 `/apps` 等 SPA 路由，详见 `nginx.conf` 头注释。

### 环境变量

| 变量               | 作用                                                       | 默认 / 示例              | 生效场景            |
| ------------------ | ---------------------------------------------------------- | ------------------------ | ------------------- |
| `VITE_API_BASE`    | 前端请求 API 的基地址，**留空 = 同源**（走代理/反代）      | 留空                     | 构建时（`.env`）    |
| `VITE_BACKEND_URL` | dev 代理与 E2E 指向的 AgileConfig 后端地址                  | `http://localhost:5017`  | dev server          |
| `BACKEND`          | 前端容器内 nginx 的反代目标                                | `http://backend:5000`    | Docker 运行时       |
| `E2E_BASE_URL`     | Playwright 的 baseURL 与 webServer 地址                    | `http://localhost:5173`  | E2E（`.env.e2e`）   |
| `E2E_ADMIN_USER`   | E2E 登录账号                                               | `admin`                  | E2E（`.env.e2e`）   |
| `E2E_ADMIN_PASSWORD` | E2E 登录密码（真实值只放 gitignore 的 `.env.e2e`）       | —                        | E2E（`.env.e2e`）   |

`.env` 为可提交的非敏感默认值；真实凭证只放 gitignore 的 `.env.e2e` / `.env.development`，不入库、不进镜像（`.dockerignore` 已排除）。

## 文档

- [使用指南（管理员向）](docs/USER_GUIDE.md)
- [贡献指南（协作与迭代流程）](CONTRIBUTING.md) · [文档地图](docs/README.md)
- 客户端接入：管理台内「接入指南」页，或 [llms-full.txt](https://raw.githubusercontent.com/JinFanZheng/agile-config-ui/main/public/llms-full.txt)（喂给 AI 编码助手即可）
- [CHANGELOG](CHANGELOG.md)

## 开发指南

| 命令             | 说明                                            |
| ---------------- | ----------------------------------------------- |
| `pnpm install`   | 安装依赖（pnpm 9+，`corepack enable` 启用）     |
| `pnpm dev`       | 开发服务器 <http://localhost:5173>              |
| `pnpm build`     | 类型检查 + 构建，产物输出 `dist/`               |
| `pnpm preview`   | 本地预览构建产物                                |
| `pnpm typecheck` | `tsc -b` 类型检查                               |
| `pnpm lint`      | ESLint 检查                                     |
| `pnpm format`    | Prettier 格式化                                 |
| `pnpm test`      | Vitest 单测（`pnpm test:watch` 监听模式）       |
| `pnpm e2e`       | Playwright E2E（对本机 5017 实例）              |

E2E 说明：复制 `.env.e2e.example` 为 `.env.e2e`（gitignore），填入指向本机 AgileConfig 实例（默认 `http://localhost:5017`）的管理员账号 `E2E_ADMIN_USER` / `E2E_ADMIN_PASSWORD`。用例全部使用自建随机前缀应用并在结束时清理，**不会触碰 `demo_app` 等已有数据**； destructive 用例（删除/回滚）也只作用于自建应用。

## 测试与质量门

- L0 静态门：`pnpm typecheck && pnpm lint && pnpm build`
- L1 单元测试：`pnpm test`
- L-Real 真实链路 E2E：`pnpm e2e`（需本机 5017 实例与 `.env.e2e` 凭证，覆盖登录 → 建应用 → 改配置 → 发布 → 回滚）
- 全量回归（发版前）：`pnpm typecheck && pnpm lint && pnpm test && pnpm e2e && pnpm build`

提交信息遵循 Conventional Commits（feat/fix/chore/...，中文描述可）。

## License

MIT — 衍生自 [dotnetcore/AgileConfig](https://github.com/dotnetcore/AgileConfig)（MIT）。
