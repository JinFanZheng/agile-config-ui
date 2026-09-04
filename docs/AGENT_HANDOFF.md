# AgileConfig 管理前端重做 — Agent 交接文档

> **你的任务**：为 AgileConfig（.NET 开源配置中心）从零构建一个全新的管理前端（独立仓库，不 fork 服务端），替换官方现有的 Ant Design Pro 模板式 UI。本文档包含完成此任务所需的全部上下文：已锁定的决策、已实测验证的 API 事实、功能范围、技术方案、里程碑与验收标准。
>
> **文档使用方式**：第 2 节的决策不要再重新讨论；第 5 节的 API 事实已在本机实测，可直接信任；第 12 节的"待核实清单"需要你在实施中补齐；其余章节是指令。

---

## 0. 第一性原则（项目的北极星，一切取舍以此为准）

**本项目做的不是"配置的 CRUD 工具"，而是"对线上系统行为的确定性变更工具"。**

推理链（理解它才能做对取舍）：配置中心让运行中的系统不重启就改变行为，价值 = 变更速度；但配置变更是唯一没有部署流程保护的线上行为变更，风险 = 爆炸半径。产品活在"快 vs 安全"的张力中，其存在意义 = 让变更**既即时又安全**。安全拆到最底是三根柱子：

- **可知**：改之前确切知道什么会变、影响谁（diff + 影响面 + 事后一致性验证）
- **可控**：只有该做的人能做，关键动作用有门槛（权限、二次确认、环境色警示）
- **可逆**：任何状态可秒级恢复（版本时间线、一键回滚）

因此：**diff / 发布 / 回滚不是功能列表中的一项，是产品本体**；应用、节点、用户、日志都是服务于这三件事的脚手架。旧 UI 的根本问题就是把配置当数据管理（表格 CRUD），而不是把变更当事件管理。

**北极星指标**：从"改完一行配置"到"确认所有客户端已生效"的路径长度。任何把这个链路割裂到多个页面的设计都是错的。

**能力边界意识**：Route B 下产品天花板 = API 天花板。审批流、定时发布、按客户端灰度分批等想法，除非 API 支持（见待核实 #4），否则明确放弃，不要在 UI 层空想。

## 1. 背景与动机（最小必要上下文）

- AgileConfig：基于 .NET Core 的轻量级配置中心，上游仓库 https://github.com/dotnetcore/AgileConfig ，MIT 协议，当前版本 **1.13.2**，活跃维护。
- 现有管理 UI 位于仓库内 `src/AgileConfig.Server.UI/react-ui-antd`，是 **UmiJS Max 4 + Ant Design Pro** 模板改造而来（package.json 的 description 还是模板原文），布局与交互是"通用后台标准件"，没有为"配置管理"场景做体验设计。
- 用户的核心抱怨：**用户友好度不够**。重做前端的全部意义在于体验提升（详见第 8 节 UX 要求），而不是功能对等的翻写。
- 服务端 API 稳定且前后端天然分离，这使"只重做前端、不动后端"可行。

## 2. 已锁定的决策（不要重开讨论）

| #   | 决策                        | 说明                                                                                                                                                  |
| --- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | **路线 B：独立前端仓库**    | 不 fork 服务端仓库。新前端作为独立项目，通过 HTTP API 对接官方服务端。                                                                                |
| D2  | **对 1.13.2 版本 API 开发** | API 无语义化版本承诺，锁定当前版本；升级上游时逐项 diff Release Notes。                                                                               |
| D3  | **MIT 衍生**                | 新前端为 MIT；README 注明"衍生自 dotnetcore/AgileConfig（MIT）"。                                                                                     |
| D4  | **本地联调实例已就绪**      | 本机 Docker 里跑着一个实例（见第 3 节），所有开发联调对它进行。                                                                                       |
| D5  | **不修改服务端**            | 一切需求通过 API 实现，服务端代码零改动。                                                                                                             |
| D6  | **不与旧 UI 兼容、不对等**  | 一切以 API 能力为边界全新设计信息架构、交互与视觉。旧 UI 源码仅作为"API 如何使用"的参考实现，不是对齐目标；页面组织、导航结构、交互流程均可推翻重来。 |

## 3. 本地环境（已就绪，开箱即用）

### 3.1 运行中的实例

| 项           | 值                                                           |
| ------------ | ------------------------------------------------------------ |
| 地址         | `http://localhost:5017`（映射容器 5000 端口）                |
| 版本         | 1.13.2（镜像 `kklldog/agile_config:latest`）                 |
| 管理员账号   | `admin` / `ss123456`（本地演示用，密码由用户首次初始化设置） |
| 存储         | SQLite（容器内），无持久卷——**删容器即丢数据**               |
| 已有演示数据 | 应用 `demo_app`（含 2 条配置，已发布 v1 版本，环境 DEV）     |

### 3.2 容器运维命令

```bash
docker logs agile_config      # 看日志
docker stop agile_config      # 停止
docker start agile_config     # 启动
```

重置实例（清空所有数据）：

```bash
docker rm -f agile_config
docker run -d --name agile_config \
  --platform linux/amd64 \
  -e TZ=Asia/Shanghai -e adminConsole=true \
  -e db__provider=sqlite -e db__conn="Data Source=agile_config.db" \
  -p 5017:5000 kklldog/agile_config:latest
# 重置后需走首启流程：GET /Admin/PasswordInited 应为 false，
# 再 POST /Admin/InitPassword {"password":"...","confirmPassword":"..."}，然后登录
```

### 3.3 关键坑（务必注意）

- **Apple Silicon 必须 `--platform linux/amd64`**：默认拉的 arm64 镜像缺少 System.Data.SQLite 的 linux-arm64 原生库，启动即崩（`SQLite.Interop.dll` 加载失败）。amd64 镜像在 OrbStack 下走 Rosetta 模拟，运行正常。
- macOS 的控制中心占用 5000 端口，所以宿主机用 5017。

## 4. 上游资源与关键路径

| 资源                                                | 位置                                                                               |
| --------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 服务端仓库                                          | https://github.com/dotnetcore/AgileConfig （默认分支 master）                      |
| 旧前端源码（仅参考）                                | `src/AgileConfig.Server.UI/react-ui-antd/`                                         | 用于理解 API 调用方式与字段语义，**不是对齐目标（D6）**          |
| 旧前端 E2E 测试（仅参考）                           | 同上 `e2e/` 目录：configuration-lifecycle、websocket-publish、permissions 三条链路 | 用于理解发布/权限链路的 API 行为与发现隐藏功能，**不是行为基准** |
| 服务端 Controller（API 真相之源）                   | `src/AgileConfig.Server.Apisite/Controllers/`                                      |
| 客户端 SDK 仓库（本任务不需要，仅参考）             | https://github.com/kklldog/AgileConfig_Client                                      |
| Wiki（含 Restful API 文档，部分内容滞后以源码为准） | https://github.com/dotnetcore/AgileConfig/wiki                                     |

## 5. 已验证的 API 事实（本机实测 + 源码核实）

> 以下内容于 2026-09-04 在本机 1.13.2 实例上验证。标 ✅ 的是实测过的，其余为源码核实。

### 5.1 认证（✅ 全部实测）

**登录**（注意路径是小写 `/admin`）：

```
POST /admin/jwt/login
Content-Type: application/json

{"userName":"admin","password":"ss123456"}
```

成功响应：

```json
{
  "status": "ok",
  "token": "<JWT, 385字符>",
  "type": "Bearer",
  "currentAuthority": ["<角色名>"],
  "currentFunctions": ["<权限码，如 Config_Add/Config_Publish>"]
}
```

失败响应：`{"status":"error","message":"密码错误"}`。

**后续请求**携带 `Authorization: Bearer <token>`；不带 token 访问受保护接口返回 **401**（✅ 实测）。

**首启初始化流程**（新 UI 必须实现对应页面）：

- `GET /Admin/PasswordInited` → `{"success":true,"data":false}` 表示超管密码未初始化
- `POST /Admin/InitPassword` body `{"password":"...","confirmPassword":"..."}`
- 修改密码：`POST /Admin/ChangePassword`（需登录）
- **注意：网络上旧文档写的默认密码 admin/123456 已过时**，当前版本首启必须走初始化流程

**权限码**：登录响应里的 `currentFunctions`（如 `Config_Add`、`Config_Edit`、`Config_Publish`、`Config_Offline`、`Config_Read`）驱动前端按钮级权限控制。`currentAuthority` 为角色。

### 5.2 通用响应约定（✅ 实测）

- 常规响应：`{"success": bool, "message": string, "data": <T>}`
- 分页响应（Search 类接口）：`{"current":1, "pageSize":20, "total":N, "success":true, "data":[...]}`；请求参数为 query 上的 `current`（默认 1）与 `pageSize`（默认 20）
- **路由为 MVC 约定路由，控制器名/动作名首字母大写**，如 `/App/Search`、`/Config/Publish`
- 部分 action 源码中未标 `[HttpPost]`（如 `CancelEdit`、`CancelSomeEdit`、`PreViewJsonFile`），按约定可用 GET 到达；对接时以实测为准

### 5.3 应用管理 `/App/*`（来源：AppController.cs；✅ Search/Add 实测）

| 动作       | 方法+路径                   | 参数                                                                     | 备注                                                                                                         |
| ---------- | --------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| 搜索       | GET `/App/Search`           | query: `name,id,group,sortField,ascOrDesc,tableGrouped,current,pageSize` | `tableGrouped=true` 时按分组嵌套（父应用带 children）                                                        |
| 新建       | POST `/App/Add`             | body: `{id,name,group,enabled,inheritanced,inheritancedApps}`            | ⚠️ **id 必填，服务端不生成**（实测返回"应用Id不能为空"）——新 UI 应自动生成（如 UUID/短横线命名）并允许用户改 |
| 编辑       | POST `/App/Edit`            | body: AppVM                                                              |                                                                                                              |
| 详情       | GET `/App/Get`              | query: `id`                                                              |                                                                                                              |
| 启停       | POST `/App/DisableOrEnable` | query: `id`                                                              |                                                                                                              |
| 删除       | POST `/App/Delete`          | query: `id`                                                              |                                                                                                              |
| 导出       | POST `/App/Export`          | body: `{appIds:[...]}`                                                   | 返回 json 文件下载                                                                                           |
| 导入预览   | POST `/App/PreviewImport`   | form-data: `file`（json）                                                | 返回预览+错误校验                                                                                            |
| 导入       | POST `/App/Import`          | body: 导入请求                                                           |                                                                                                              |
| 可继承应用 | GET `/App/InheritancedApps` | query: `currentAppId`                                                    |                                                                                                              |
| 应用授权   | POST `/App/SaveAppAuth`     | body: `{appId, authorizedUsers}`                                         |                                                                                                              |
| 查应用授权 | GET `/App/GetUserAppAuth`   | query: `appId`                                                           |                                                                                                              |
| 全部分组名 | GET `/App/GetAppGroups`     | —                                                                        | 用于分组下拉                                                                                                 |

### 5.4 配置管理 `/Config/*`（来源：ConfigController.cs；✅ Add/Search/WaitPublishStatus/Publish/PublishHistory 实测）

**ConfigVM 字段**（实测返回）：`id, appId, group, key, value, description, env, status, onlineStatus, editStatus, createTime, updateTime`。核心状态语义：`onlineStatus`=当前线上版本，`editStatus`=待发布改动（0 无 / 1 新增 / 2 编辑 / 3 删除方向），`env` 默认 `DEV`。

| 动作           | 方法+路径                            | 参数                                                                           | 备注                                                                                                                     |
| -------------- | ------------------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| 分页搜索       | GET `/Config/Search`                 | query: `appId,group,key,onlineStatus,sortField,ascOrDesc,env,current,pageSize` |                                                                                                                          |
| 单条新建       | POST `/Config/Add`                   | body: ConfigVM；query: `env`                                                   | ✅ 实测                                                                                                                  |
| 批量新建       | POST `/Config/AddRange`              | body: `[ConfigVM]`；query: `env`                                               | `group:key` 重复会报错                                                                                                   |
| 编辑           | POST `/Config/Edit`                  | body: ConfigVM；query: `env`                                                   |                                                                                                                          |
| 删除           | POST `/Config/Delete`                | query: `id,env`                                                                | 软删除：已发布过的进入"待发布删除"状态                                                                                   |
| 批量删除       | POST `/Config/DeleteSome`            | body: `[ids]`；query: `env`                                                    |                                                                                                                          |
| 取消单条改动   | GET `/Config/CancelEdit`             | query: `configId,env`                                                          | 撤销未发布的编辑                                                                                                         |
| 批量取消       | GET `/Config/CancelSomeEdit`         | body: `[ids]`；query: `env`                                                    |                                                                                                                          |
| **待发布统计** | GET `/Config/WaitPublishStatus`      | query: `appId,env`                                                             | ✅ 实测返回 `{"addCount":2,"editCount":0,"deleteCount":0}`                                                               |
| **发布**       | POST `/Config/Publish`               | body: `{appId, ids, log}`；query: `env`                                        | ✅ 实测 `{"appId":"demo_app","log":"first publish"}` 即成功；发布所有待发布项                                            |
| **回滚**       | POST `/Config/Rollback`              | query: `publishTimelineId,env`                                                 | 回滚到指定发布时间线节点                                                                                                 |
| 发布历史(应用) | GET `/Config/PublishHistory`         | query: `appId,env`                                                             | ✅ 实测返回版本分组数组，每组含 `timelineNode{id,version,log,publishTime,publishUserName,env}` 与 `list[该版本全量配置]` |
| 发布历史(单条) | GET `/Config/ConfigPublishedHistory` | query: `configId,env`                                                          |                                                                                                                          |
| 全量           | GET `/Config/All`                    | query: `env`                                                                   |                                                                                                                          |
| KV 文本视图    | GET `/Config/GetKvList`              | query: `appId,env`                                                             |                                                                                                                          |
| JSON 视图      | GET `/Config/GetJson`                | query: `appId,env`                                                             | jsonc 含描述注释                                                                                                         |
| JSON 保存      | POST `/Config/SaveJson`              | body: SaveJsonVM；query: `appId,env`                                           | 支持 isPatch                                                                                                             |
| KV 保存        | POST `/Config/SaveKvList`            | body: SaveKVListVM；query: `appId,env`                                         | 支持 isPatch                                                                                                             |
| JSON 导出      | GET `/Config/ExportJson`             | query: `appId,env`                                                             |                                                                                                                          |
| JSON 上传预览  | GET/POST `/Config/PreViewJsonFile`   | form: file                                                                     | 层级 key 拆为 group+key，注释入 Description                                                                              |
| 环境间同步     | POST `/Config/SyncEnv`               | query: `appId,currentEnv`；body: `{toEnvs:[...]}`                              |                                                                                                                          |

**没有专用 diff 端点**：diff 由前端组合数据实现（当前值 vs 待发布值用 `Search` 的 `onlineStatus`/`editStatus`；历史版本间对比用 `PublishHistory` 返回的全量快照 `list`）。

### 5.5 其余控制器（源码已确认存在，端点细节实施时读源码补齐）

`UserController`、`RoleController`、`ServerNodeController`、`ServiceController`（服务注册中心）、`SysLogController`、`SSOController`（OIDC）、`ReportController`（客户端心跳/上报）、`HomeController`（首页统计）、`RemoteOPController`。路径模式同为 `/{Controller}/{Action}`。客户端拉取配置的 API 在 `Controllers/api/`（含 v2），**管理 UI 不用**。

## 6. 功能范围与页面清单

优先级：P0 = MVP 必须有；P1 = 覆盖 API 的完整管理能力；P2 = 锦上添花。下表是**能力清单**而非页面规格——信息架构按用户任务重新设计（D6），页面怎么组织、合并、拆分由设计决定，旧 UI 路由仅用于确认功能没有遗漏。

| 页面/能力                                                     | 旧 UI 对应路由（仅功能发现参考） | 核心 API                                     | 优先级 |
| ------------------------------------------------------------- | -------------------------------- | -------------------------------------------- | ------ |
| 登录                                                          | /user/login                      | /admin/jwt/login                             | P0     |
| 首启密码初始化                                                | /user/initPassword               | /Admin/PasswordInited, /Admin/InitPassword   | P0     |
| 概览仪表盘                                                    | /home                            | /Home/* 统计接口                             | P1     |
| 应用列表+CRUD                                                 | /app                             | /App/*                                       | P0     |
| 配置管理（表格/KV/JSON 三视图）                               | /app/config/:app_id/:app_name    | /Config/*                                    | P0     |
| 待发布状态+发布                                               | （现有 UI 内嵌）                 | /Config/WaitPublishStatus, /Config/Publish   | P0     |
| 发布历史+回滚+版本 diff                                       | （现有 UI 内嵌）                 | /Config/PublishHistory, /Config/Rollback     | P0     |
| 客户端（在线实例）列表                                        | /client                          | /Report/* 或 /client 相关                    | P1     |
| 发布影响面与客户端版本一致性（新能力，旧 UI 没有，见第 0 节） | —                                | 客户端心跳/版本数据（见待核实 #8）           | P1     |
| 节点管理                                                      | /node                            | /ServerNode/*                                | P1     |
| 用户管理                                                      | /users                           | /User/*                                      | P1     |
| 角色权限                                                      | /roles                           | /Role/*                                      | P1     |
| 系统日志                                                      | /logs                            | /SysLog/*                                    | P1     |
| 服务注册中心                                                  | /service                         | /Service/*                                   | P2     |
| OIDC/SSO 登录与设置                                           | /oidc/login                      | /SSO/*, /admin/oidc/login                    | P2     |
| 应用导入导出                                                  | （应用页内）                     | /App/Export, /App/PreviewImport, /App/Import | P2     |
| 环境间同步                                                    | （配置页内）                     | /Config/SyncEnv                              | P2     |
| 继承应用/公共配置合并视图                                     | （配置页内）                     | /App/InheritancedApps + /Config/*            | P1     |

> **继承应用说明**：应用可声明"继承"另一个（公共）应用来共享配置。配置页必须能展示"继承自 xxx"的标识，以及合并后该应用最终生效的配置视图（哪些来自继承、哪些被本应用覆盖）。合并数据来源待核实（见第 12 节 #7），实现前先读旧 UI 的 Configs 页面源码。

多环境（DEV/TEST/PROD...）是贯穿性概念：现有 UI 在配置页内切环境，新 UI 建议**全局环境切换器**（见第 8 节）。

## 7. 技术方案（默认推荐，替换需在 README 说明理由）

| 层         | 选型                                                      | 理由                                                                                   |
| ---------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 构建       | **Vite 7 + React 18 + TypeScript**                        | 快、主流、无模板包袱                                                                   |
| 路由       | React Router v7                                           | 生成式路由（如 `/app/:appId/config`）                                                  |
| 数据层     | **TanStack Query**                                        | 缓存/失效/轮询天然匹配配置管理场景（如轮询 WaitPublishStatus）                         |
| UI 组件    | **shadcn/ui + Tailwind CSS 4**（已锁定）                  | 代码完全可控，能忠实实现 7.1 的设计语言；antd 已被否决（与摆脱旧 UI 模板感的目标冲突） |
| 状态       | zustand（仅存 token/当前环境/当前用户）                   | 服务端状态全交 Query                                                                   |
| 表单       | react-hook-form + zod                                     | 校验与类型一致                                                                         |
| 配置编辑器 | **monaco-editor**（JSON 视图、diff 视图）                 | 旧 UI 同款，diff 编辑器直接可用                                                        |
| 表格       | TanStack Table                                            | 行选择、分组折叠、排序                                                                 |
| 测试       | Vitest（单元）+ **Playwright（E2E，对本机 5017 实例跑）** | E2E 链路 = 登录→建应用→改配置→发布→回滚                                                |
| HTTP       | ky 或 axios 薄封装                                        | 统一注入 Bearer、401 跳登录、解包 `{success,message,data}`                             |

### 7.1 设计语言（已锁定）：Linear 式深色专业风

**视觉基准**：Linear、Raycast、Supabase Dashboard——冷静、快、专业的开发者工具气质。**暗色是主主题（默认）**，亮色主题为后期可选项（P2）。此方向由用户拍板，不要重开讨论。

**Design Tokens**（用这些值初始化 Tailwind 主题；实施中可微调明度，但基调和环境色语义不得变）：

| Token                               | 值                                | 用途                                                               |
| ----------------------------------- | --------------------------------- | ------------------------------------------------------------------ |
| `bg-page`                           | `#0F1117`                         | 页面底色                                                           |
| `bg-panel`                          | `#16181F`                         | 卡片/面板                                                          |
| `bg-elevated`                       | `#1A1D26`                         | 弹层/下拉菜单                                                      |
| `border-default`                    | `#262A36`                         | 分隔与描边（层级靠边框+底色差表达，阴影克制）                      |
| `text-primary`                      | `#E6E8EE`                         | 主文本                                                             |
| `text-secondary`                    | `#9AA0B0`                         | 次文本/说明                                                        |
| `accent`                            | `#6E7BF2`                         | 主按钮、链接、focus 态（靛紫，全站唯一强调色）                     |
| `env-dev` / `env-test` / `env-prod` | `#3FB950` / `#D29922` / `#F85149` | 环境标识色，全局环境切换器、徽标、页面顶条一致使用                 |
| `success` / `warning` / `danger`    | `#3FB950` / `#D29922` / `#F85149` | 状态语义色（待发布=warning、已上线=success、删除/回滚警示=danger） |

**字体与密度**：

- 界面文本 Inter；**配置的 key、value、AppId/Secret、diff 内容一律等宽字体**（JetBrains Mono 或 `ui-monospace`）——配置中心的内容主体是代码性质的文本，等宽是身份的一部分
- 基准字号 13px、紧凑行高、窄表格行、高信息密度
- 圆角：控件 6px、卡片 8px；动效只做 120–160ms 的微过渡（ease-out），不做任何花哨动画
- 交互气质：键盘优先（⌘K 命令面板列为 P1），hover 态克制

**目录结构建议**：

```
src/
  api/            # 按资源分文件：auth.ts, apps.ts, configs.ts, ...
  components/     # 通用组件（DiffView, EnvSwitcher, StatusBadge...）
  features/       # 按页面域组织：apps/, configs/, publish/, ...
  hooks/          # useAuth, useCurrentEnv, ...
  lib/            # http client, query client, utils
  routes/         # 路由定义
```

**开发代理（重要实现细节）**：服务端 API **没有统一前缀**（`/App/*`、`/Config/*`、`/admin/*`、`/User/*`...），且服务端未开 CORS。Vite dev server 需按路径清单代理（或写一个 rewrite 中间件剥掉自定义前缀）：

```ts
// vite.config.ts 示意
const API_PREFIXES = [
  '/App',
  '/Config',
  '/admin',
  '/Admin',
  '/User',
  '/Role',
  '/ServerNode',
  '/Service',
  '/SysLog',
  '/SSO',
  '/Report',
  '/Home',
  '/RemoteOP',
]
server: {
  proxy: Object.fromEntries(API_PREFIXES.map((p) => [p, 'http://localhost:5017']))
}
```

生产部署同理：nginx 静态托管新前端，`location` 匹配上述前缀 `proxy_pass` 到 AgileConfig（同源，无 CORS 问题）。API 地址一律走环境变量，禁止硬编码。

## 8. UX 要求（本项目存在的理由，逐条验收）

1. **全局环境切换器**：顶栏常驻 DEV/TEST/PROD 切换，所有配置相关页面跟随切换；当前环境用颜色区分（如 DEV 绿 / TEST 橙 / PROD 红）。
2. **待发布改动全局可见**：应用列表和配置页常显"待发布"徽标（add/edit/delete 三色计数，数据源 WaitPublishStatus，轮询或手动刷新）。
3. **发布前强制 diff 预览**：点发布必须先弹出变更对比（新增/修改/删除分组着色，monaco diff 或双栏），确认后才能发布；发布需填写说明（log）。
4. **回滚可视化**：发布历史以时间线呈现，任选两个版本可 diff；回滚操作二次确认并明示"将回到 vX"。
5. **配置表格体验**：group 分组折叠、关键字即时过滤（前端过滤+服务端搜索结合）、多选批量操作（删除/取消改动/导出）、行内快速编辑 value。
6. **创建应用自动生成 ID**（服务端要求 id 必填，旧 UI 让用户手填——这是明确要修掉的糟点），并提供"复制 AppId/Secret"一键操作。
7. 暗色为默认主题（设计语言见 7.1，tokens 从 M0 起生效），亮色主题列为 P2；中文为默认语言，文案表意准确（术语与附录 13.4 术语表一致）。
8. **加载与空态**：所有列表有骨架屏与空态引导（如"还没有应用，创建第一个"）。
9. **按钮级权限**：按 `currentFunctions` 权限码隐藏/禁用无权操作。
10. 键盘可用性：⌘K 快速搜索应用（P2）、Esc 关弹窗、表格多选支持 shift 范围选（P2）。
11. **并发编辑保护**：服务端为 last-write-wins（无乐观锁）。编辑保存前比对服务端最新 `updateTime`，若他人已修改则提示"配置已被他人修改"，让用户选择覆盖或放弃；发布前重新拉取待发布列表，避免基于过期数据发布。
12. **大配置量性能**：单应用配置可能上千条，配置表格必须虚拟滚动（TanStack Virtual），过滤/分组在数据量大时保持即时响应。
13. **影响面与一致性视图（第一性推论，见第 0 节"可知"）**：发布确认时展示"此变更将推送给 N 个在线客户端、波及 M 个继承应用"；发布后提供"服务端最新版本 vs 各在线客户端实际版本"的一致性视图，未跟上版本的客户端醒目标出。依赖待核实 #8。

## 9. 工程规范

- 提交信息：Conventional Commits（feat/fix/chore/...），中文描述可。
- 代码风格：ESLint + Prettier，CI 跑 `lint + tsc --noEmit + vitest + playwright`。
- **凭证纪律**：本地账号密码只放 `.env.development`（gitignore），文档中不落真实密码；对实例的破坏性操作（删除/回滚）E2E 里使用自建的应用，不动 `demo_app`。
- 分支：`main` 可运行；功能分支 `feat/<scope>`。
- **文案与 i18n**：默认仅中文；所有界面文案收敛到独立文案模块（如 `src/strings/` 按页面分文件），**不引入 i18n 框架**（YAGNI），未来需要多语言时再抽换。
- **渲染安全**：配置 value/description 是任意用户输入文本，一律走 React 正常渲染，**全项目禁止 `dangerouslySetInnerHTML`**；diff/JSON/KV 视图按纯文本渲染。
- **Token 存储**：localStorage 存 JWT（内网工具可接受的权衡：XSS 可窃取；若未来公网部署应改为 httpOnly cookie 并配服务端）。401 全局拦截：清除本地会话 → 跳登录页并记录来源路由，登录后回跳。
- **E2E 数据纪律**：用例内自建随机前缀应用（如 `e2e_<ts>_app`）并在 afterAll 清理；禁止动 `demo_app`；CI（GitHub Actions）用 service 容器起 AgileConfig（`platform: linux/amd64`），首启密码初始化由 workflow 脚本完成。
- **环境要求**：Node 22 LTS + pnpm；仅支持 evergreen 浏览器（Chrome/Edge/Firefox/Safari 最近两个大版本），不做 IE 兼容。
- README 面向最终用户：快速开始（Docker 起后端 + 本前端）、架构图、与官方 UI 的差异。

## 10. 里程碑与验收标准（DoD）

| 里程碑                  | 内容                                                                                                                                                             | 完成标准                                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **M0 脚手架**           | 项目初始化、代理打通、布局壳、登录+首启初始化页                                                                                                                  | 能登录本机实例拿到 token 并显示当前用户；未初始化实例能走完 InitPassword 流程；401 自动跳登录     |
| **M1 应用管理**         | 应用列表（分组视图/搜索/分页）、新建（自动生成ID）/编辑/启停/删除、Secret 查看                                                                                   | E2E：创建→编辑→停用→删除全链路通过                                                                |
| **M2 配置管理**         | 配置表格三视图（表格/KV/JSON）、增删改、取消改动、批量操作、环境切换器、继承标识                                                                                 | 对 `demo_app` 加/改/删配置，待发布徽标计数正确；脚本灌入 1000+ 条配置时表格仍流畅（虚拟滚动生效） |
| **M3 发布链路（核心）** | diff 预览、发布、发布历史时间线、版本 diff、回滚                                                                                                                 | E2E：改配置→diff 预览→发布→历史可见→回滚到 v1，值恢复                                             |
| **M4 运维视图**         | 概览仪表、客户端在线列表、节点管理、系统日志                                                                                                                     | 各页数据正确、轮询刷新                                                                            |
| **M5 权限体系**         | 用户管理、角色管理、按钮级权限、修改密码                                                                                                                         | 受权限账号登录后无权按钮不可用                                                                    |
| **M6 打磨与交付**       | P2 功能（服务注册/导入导出/环境同步/SSO）、亮色主题适配、README、部署文档、**前端自身 Docker 镜像**（nginx:alpine + 静态产物 + 反代配置，独立部署，不依赖旧 UI） | 全量 E2E 绿；`docker compose up` 一条命令起完整演示（新前端 + AgileConfig 后端）                  |

## 11. 风险与注意事项

- **API 无版本承诺**：锁定 1.13.2。升级上游时逐项对照 Release Notes 与 Controller 源码 diff，再更新第 5 节。
- **CORS 未开启**：dev 用代理、生产同源部署，不走跨域直连。
- **部分端点 GET/POST 语义模糊**（源码未显式标注），对接时逐个实测确认。
- 本机实例是 amd64 模拟运行，偶发慢属正常，不是前端性能问题。
- **JWT 无刷新机制**：按"token 会过期"设计，全局 401 拦截清会话跳登录并回跳原页面；不要假设存在静默续期（TTL 见待核实 #6）。
- **并发编辑为 last-write-wins**：服务端无乐观锁，前端只能提示（UX #11）不能真正阻止覆盖。
- **不与旧 UI 对齐**（D6）：信息架构、页面组织、交互流程均可重新设计；旧 UI 源码与 E2E 的价值仅在于理解 API 行为、发现隐藏功能（如继承应用、环境同步）。
- 管理端是否依赖 WebSocket 实时推送（旧 UI 里有 websocket-publish 测试）→ 见待核实清单。

## 12. 待核实清单（实施中补齐，完成后更新本文档）

1. 其余控制器（User/Role/ServerNode/Service/SysLog/SSO/Report/Home）的完整端点与参数——M4/M5 前补。
2. 管理端是否需要 WebSocket 连接（旧 UI e2e 有 websocket-publish；确认管理界面是否有实时推送，若无则轮询即可）。
3. 生产镜像替换方案：官方镜像内 UI 静态文件的具体路径（进入容器 `find /app -name 'index.html'` 确认），决定是否提供"替换镜像内 UI"的构建脚本（当前默认独立 nginx 部署，已够用）。
4. `Config/Publish` 的 `ids` 字段语义（实测空 body 只传 appId+log 即全量发布，ids 是否支持部分发布待验证）——**这不是实现细节而是能力边界**：若支持部分发布，则可设计"分批/灰度发布"UI；若不支持，Route B 下灰度发布明确放弃，不要在 UI 层模拟。
5. 多环境的完整列表来源（环境是内置 DEV/TEST/PROD 还是可配置——读 `SettingController`/系统设置相关源码）。
6. ~~JWT 的 TTL~~ **已核实（2026-09-04，M0）**：登录返回的 JWT `exp - nbf = 86400s`，即 **24 小时**，无刷新机制。会话过期提醒可按"登录后 23h 左右"设计；过期由全局 401 拦截兜底。
7. 继承应用合并视图的实现方式：读旧 UI `react-ui-antd/src/pages/Configs` 源码，确认"继承自"标识与合并生效视图的数据来源（前端组合 or 已有接口）。
8. 客户端心跳数据中是否包含其当前配置版本（publishTimelineId / version）——决定能否实现 UX #13 的"服务端最新版本 vs 客户端实际版本"一致性视图。上游 Release Notes 提到过用发布时间线虚拟 ID 对比客户端版本，服务端有此意图，优先核实（读 `ReportController` 与客户端心跳实体）。

## 13. 附录

### 13.1 实测记录（2026-09-04，实例 1.13.2 @ localhost:5017）

```bash
# 登录（✅）
curl -s -X POST http://localhost:5017/admin/jwt/login \
  -H 'Content-Type: application/json' \
  -d '{"userName":"admin","password":"ss123456"}'
# → {"status":"ok","token":"eyJ...","type":"Bearer","currentAuthority":[...],"currentFunctions":[...]}

# 无 token 访问（✅ 401）
curl -s -o /dev/null -w "%{http_code}" "http://localhost:5017/App/Search?current=1"
# → 401

# 创建应用（✅；注意 id 必须客户端生成）
curl -s -X POST http://localhost:5017/App/Add -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"id":"demo_app","name":"demo-app","group":"demo","enabled":true,"inheritanced":false}'
# → {"data":{"id":"demo_app","name":"demo-app","group":"demo","creator":"super_admin",...},"success":true}

# 加配置（✅）
curl -s -X POST http://localhost:5017/Config/Add -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"appId":"demo_app","group":"app","key":"timeout_seconds","value":"30","description":"request timeout"}'
# → {"success":true,"data":{"id":"895c...","env":"DEV","status":1,"onlineStatus":0,"editStatus":0,...}}

# 待发布统计（✅）
curl -s "http://localhost:5017/Config/WaitPublishStatus?appId=demo_app" -H "$AUTH"
# → {"success":true,"data":{"addCount":2,"editCount":0,"deleteCount":0}}

# 发布（✅）
curl -s -X POST http://localhost:5017/Config/Publish -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"appId":"demo_app","log":"first publish"}'
# → {"success":true,"message":""}

# 发布历史（✅）
curl -s "http://localhost:5017/Config/PublishHistory?appId=demo_app" -H "$AUTH"
# → {"success":true,"data":[{"key":1,"timelineNode":{"version":1,"log":"first publish","publishUserName":"admin","env":"DEV",...},"list":[<该版本全量配置快照>]}]}
```

### 13.2 旧 UI 路由表（功能发现清单，非对齐目标）

`/user/login`、`/user/initPassword`、`/oidc/login`、`/home`、`/node`、`/app`、`/app/config/:app_id/:app_name`、`/client`、`/service`、`/users`、`/roles`、`/logs`

### 13.3 服务端 Controller 清单（API 真相之源）

`src/AgileConfig.Server.Apisite/Controllers/` 下：`AdminController`、`AppController`、`ConfigController`、`HomeController`、`RemoteOPController`、`RemoteServerProxyController`、`ReportController`、`RoleController`、`SSOController`、`ServerNodeController`、`ServiceController`、`SysLogController`、`UserController`；子目录 `api/`（客户端拉配置用，管理 UI 不涉及）。

### 13.4 术语表

| 术语                     | 含义                                                                   |
| ------------------------ | ---------------------------------------------------------------------- |
| 应用 (App)               | 配置的归属单元，有唯一的 AppId 和 Secret，客户端 SDK 靠它拉配置        |
| 环境 (Env)               | DEV/TEST/PROD 等，配置与环境正交隔离，同一应用每个环境独立一套配置     |
| 待发布                   | 已编辑但尚未发布的改动（服务端 editStatus 字段标记），此时客户端看不到 |
| 发布 (Publish)           | 把所有待发布改动打包成一个版本推给客户端，客户端即时收到               |
| 时间线 (PublishTimeline) | 每次发布生成的版本节点（publishTimelineId），回滚的锚点                |
| 回滚 (Rollback)          | 把应用回退到某个历史时间线节点的全量配置                               |
| 继承应用/公共应用        | 被其他应用继承的应用；子应用自动获得其配置，本应用同名 key 可覆盖      |
| 节点 (ServerNode)        | AgileConfig 服务端集群的一个实例，节点间平等、共享数据库               |
| 客户端 (Client)          | 嵌入了 AgileConfig.Client SDK 的业务服务实例，通过心跳上报状态         |
