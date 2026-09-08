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

**ConfigVM 字段**（实测返回）：`id, appId, group, key, value, description, env, status, onlineStatus, editStatus, createTime, updateTime`。核心状态语义（**2026-09-04 源码+实测定案，修正原记载**）：`EditStatus` 枚举 `Add=0 / Edit=1 / Deleted=2 / Commit=10`（10=已提交无待发布）；`OnlineStatus` `WaitPublish=0 / Online=1`；**编辑已上线项会把该行 onlineStatus 重置为 0**，故行级判定一律以 editStatus 为准（已上线= editStatus≠0）。

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
| **待发布统计** | GET `/Config/WaitPublishStatus`      | query: `appId,env`                                                             | ✅ 信封 `{success,data}`，data=`{"addCount":2,"editCount":0,"deleteCount":0}`（2026-09-08 ITER-11 修正：此前误记为裸 JSON；经上游 1.13.2 源码与本机实测双重核实，前端 `src/api/configs.ts` 一直按信封解包） |
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

> **安全相关实测（2026-09-07，ITER-07）**：**未分配角色的新用户自动获得内置 `Operator` 角色**（登录响应 currentAuthority 含 Operator，权限码=APP_*/CONFIG_* 全套，不含 USER/ROLE/NODE/CLIENT/LOG/SERVICE 域）；服务端越权拒绝返回 **403 空内容**；`User/ResetPassword` 重置为固定默认密码 **123456**（UI 已明示）。

> **客户端实测补充（2026-09-07，C# 验证客户端 `tools/verify-client`）**：① 应用 `secret` 由客户端在 Add/Edit 时提供，服务端**不自动生成**（为空则 SDK 连接失败难排查）；② 单容器 adminConsole 拓扑下节点表默认为空，`SearchServerNodeClients` 只聚合**在线节点**的客户端——需注册容器内可达的节点地址（Docker 下为 `http://localhost:5000` 而非宿主 5017），等 ~30s echo 探活置在线后客户端才出现在列表；③ 改值→发布→WebSocket 推送→客户端免重启生效实测 ~1s。

> **1.13.2 镜像与 master 源码差异（2026-09-07 验收实测）**：`RemoteOP/OneClientDoActionAsync`、`AppClientsDoActionAsync`、`AllClientsDoActionAsync` 为 master 新增端点，**1.13.2 镜像返回 404**——客户端运维动作必须走 `RemoteServerProxy/Client_Reload|Client_Offline|AllClients_Reload`（经节点代理，query 带 address=节点地址）；且 Vite 代理与 nginx 前缀清单均需包含 `/RemoteServerProxy`。

> **安全相关实测（2026-09-07，ITER-06）**：`Report/*`（Clients/ServerNodeClients/SearchServerNodeClients/各 Count/RemoteNodesStatus）与 `Home/Sys` 为**匿名端点**（面向客户端 SDK/实例信息），无 token 可访问；据此概览页在无有效会话时不会触发 401，401 拦截用例需走 `App/Search` 等鉴权端点。

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

### 7.0 SSO/OIDC 接入事实（ITER-25 Keycloak 端到端实测回写）

- **服务端配置**（appsettings `SSO:`，Docker env 用 `__`）：总开关 `SSO:enabled`（显式，非配置齐全自动开）+ `SSO:loginButtonText`（按钮文案）+ `SSO:OIDC:*` 九项（clientId/clientSecret/authorizationEndpoint/tokenEndpoint/redirectUri/userIdClaim/userNameClaim/scope/tokenEndpointAuthMethod）
- **端点视角分离**：authorizationEndpoint 是浏览器访问（配用户可达地址）；tokenEndpoint 是服务端容器发起（配容器可达地址，如 host.docker.internal）
- **回调链路（关键语义）**：`redirectUri` 必须指向**前端同源**的 `/SSO/Index`（如 `http://<前端>/SSO/Index`，由前端 nginx 反代到 backend）——backend `SSSOController.Index` 会 `Redirect(PathBase + "/ui#/oidc/login?code=")`，同源部署下该地址回落到本前端 SPA，`main.tsx` 挂载前解析 hash 兑换（`GET /admin/oidc/login?code=`，响应与密码登录同构）写会话。若 redirectUri 直指 backend 端口，回调会被 backend 自带的官方 adminConsole（/ui）消费
- **首登用户**由服务端按 IdToken 的 userNameClaim 自动入库（Source=SSO，默认 Operator 角色）；JWT 含 `username` claim，前端兑换后解码补全会话用户名
- 前端适配：登录页按钮由 `ssoEnabled`+`/SSO/LoginUrl` 探测驱动（400 隐藏），文案用 `ssoButtonText`（缺省回退）

### 7.1 设计语言（已锁定，2026-09-04 用户选型）：多主题体系，默认石墨（C）

> **决策（ITER-01 选型结果，用户拍板）**：主布局/信息架构定稿；五种风格**全部保留为可切换主题**；**默认主题 = 石墨（graphite，黑白高对比开发者风）**。实现见 ITER-02（主题引擎 + 令牌契约，`src/index.css` 为唯一事实源）。ITER-12 增补 5 套"盲盒"主题（曜石/紫夜/樱粉/摩卡/森夜），共十套（5 浅 + 5 深），深浅集合见 `src/lib/themes.ts` 的 `isDarkTheme`。

**十主题**（前五套 id 与静态稿对应，`design/previews/` 留档；后五套为 ITER-12 盲盒皮肤，无静态稿、以实现为准）：

| 主题 id            | 名称     | 气质                           | 关键色                    |
| ------------------ | -------- | ------------------------------ | ------------------------- |
| `graphite`（默认） | 石墨     | 黑白高对比、1px 硬边框、无阴影 | 底 #FFFFFF / 墨 #18181B   |
| `clear-blue`       | 晨雾蓝   | 亮色企业清爽                   | 底 #F7F9FC / 蓝 #2456D6   |
| `warm-paper`       | 暖纸     | 暖调极简、墨色主按钮           | 底 #F6F4EF / 墨 #2B2620   |
| `navy-console`     | 深蓝中控 | 暗色运维控制台                 | 底 #0A1424 / 天青 #38BDF8 |
| `fresh-mint`       | 薄荷     | 清新圆润 SaaS                  | 底 #F5FAF8 / 青绿 #0F766E |
| `obsidian`         | 曜石     | OLED 纯黑终端风、白强调（ITER-12） | 底 #000000 / 白 #FAFAFA   |
| `violet-night`     | 紫夜     | 深紫罗兰夜域（ITER-12）        | 底 #120F1E / 紫罗兰 #A78BFA |
| `sakura`           | 樱粉     | 浅玫瑰、最柔圆角（ITER-12）    | 底 #FDF7F9 / 品红 #B52A86  |
| `mocha`            | 摩卡     | 暖棕深色、奶油金强调（ITER-12） | 底 #16120B / 奶油金 #EAD9AE |
| `forest`           | 森夜     | 深绿夜林、月光银强调（ITER-12） | 底 #0C1410 / 银绿 #D5E8DA  |

**跟随系统档（ITER-13/14）**：设置值哨兵 `'system'`（非具体主题）；深/浅映射**用户可配置**（store `systemDark`/`systemLight`，默认深=`navy-console`、浅=`graphite`，选项限定各自深浅组，设置页跟随系统块内两个下拉即时生效），解析在 `lib/themes.ts` 的 `resolveThemeSetting(theme, prefersDark, systemDark, systemLight)`，store/boot 脚本同规则。store 派生 `resolvedTheme`（monaco 深浅、切换器文案消费它），`prefers-color-scheme` 变化实时重解析。默认主题仍为 graphite（system 为显式 opt-in）。切换器与设置页按 浅色/深色 两组呈现（设置页为全宽区块：跟随系统块 + 色卡网格）。

**主题切换边界（契约）**：主题只改变**颜色 / 圆角 / 阴影**三维度（通过 `html[data-theme]` 上的 CSS 变量实现）；**布局、信息架构、密度、排版全局恒定**，不随主题变。

**不变量（任何主题下不得变）**：

- 环境语义色：DEV 绿 / TEST 橙 / PROD 红
- 状态语义：待发布=warning、已上线=success、删除/回滚=danger、新增=info
- 密度：基准 13px、紧凑行高；key/value/AppId/Secret/diff 一律等宽字体
- 动效只做 120–160ms ease-out 微过渡；键盘优先

**令牌契约**（`src/index.css`，语义名跨主题稳定）：`--bg-page/--bg-panel/--bg-elevated/--bg-input`、`--border-default/--border-strong`、`--text-primary/--text-secondary`、`--accent/--accent-hover/--accent-foreground`、`--info/--success/--warning/--danger`、`--env-dev/--env-test/--env-prod`、`--bg-hover/--bg-selected/--text-selected`（悬停与选中态，2026-09-04 验收反馈补入：选中底 vs 页面底 ≥1.10、选中字 vs 选中底 ≥4.5，`scripts/selected-audit.mjs` 断言）、`--radius-control/--radius-card`、`--fx-card/--fx-overlay`（阴影）、`--scrollbar-thumb`。

> 以下为历史留档（M0 所用、已被否决的 Linear 暗色方向，勿再实现）：

**视觉基准**：Linear、Raycast、Supabase Dashboard——冷静、快、专业的开发者工具气质。暗色是主主题。~~已否决~~

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
7. 十主题可切换（ITER-12 起）、默认石墨（设计语言见 7.1，2026-09-04 选型修订；主题切换即时生效并持久化）；中文为默认语言，文案表意准确（术语与附录 13.4 术语表一致）。
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

1. ~~其余控制器（User/Role/ServerNode/Service/SysLog/SSO/Report/Home）的完整端点与参数~~ **已核实（2026-09-04，ITER-02 期间）**：管理面 13 Controller / 86 端点全量清点并逐迭代映射，见 [API_INVENTORY.md](API_INVENTORY.md)（用户要求全部适配；4 项显式豁免待确认；参数级细节在各迭代实施时以源码+实测补齐）。
2. ~~管理端是否需要 WebSocket~~ **已核实（2026-09-07，ITER-06）**：旧 UI 前端源码无任何 WebSocket/EventSource 使用（ws 是客户端 SDK 与服务端的通道）；管理端**轮询即可**。
3. 生产镜像替换方案：官方镜像内 UI 静态文件的具体路径（进入容器 `find /app -name 'index.html'` 确认），决定是否提供"替换镜像内 UI"的构建脚本（当前默认独立 nginx 部署，已够用）。
4. ~~`Config/Publish` 的 `ids` 字段语义~~ **已核实（2026-09-04，ITER-05 实测）**：**支持部分发布**。实验：2 条待发布配置带 `ids=[id1]` 发布 → 成功，`not_me` 仍处待发布（addCount=1），v1 快照仅含 `only_me`。⇒ Route B 下可做"选择发布范围"UI（已落地于发布弹窗条目勾选）；真·灰度分批（按客户端分批推送）仍不在 API 能力内，不做。
5. ~~多环境列表来源~~ **已核实（2026-09-07）**：`Home/Sys` 返回 `envList`（服务端可配置环境清单）；前端 EnvSwitcher 应以它为准，缺省回退 DEV/TEST/PROD。
6. ~~JWT 的 TTL~~ **已核实（2026-09-04，M0）**：登录返回的 JWT `exp - nbf = 86400s`，即 **24 小时**，无刷新机制。会话过期提醒可按"登录后 23h 左右"设计；过期由全局 401 拦截兜底。
7. ~~继承应用合并视图的实现方式~~ **已核实（2026-09-04，ITER-04）**：旧 UI Configs 页**没有**合并视图（仅查本应用）；服务端无专用合并端点。定案=**前端组合**：本应用 `Config/Search`（pageSize 传大值一次拉全，服务端内存分页仅校验 ≤0）+ 各继承应用 `Config/Search`，按 `group+key` 合并、本应用覆盖优先、继承行只读并标注来源应用。
8. ~~客户端心跳是否含版本字段~~ **已核实（2026-09-07，源码 ClientInfo）**：字段仅 Id/AppId/Address/Tag/Name/Ip/Env/LastHeartbeatTime/LastRefreshTime，**无版本/publishTimelineId**。UX #13 一致性视图降级实现：以「LastRefreshTime vs 最新版本发布时间」推断未跟上的客户端（时间推断，非版本精确比对，UI 上如实标注）。
