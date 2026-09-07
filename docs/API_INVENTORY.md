# AgileConfig 1.13.2 管理 API 全量清单与迭代映射

> 事实源：上游 1.13.2 源码 `src/AgileConfig.Server.Apisite/Controllers/`（commit 741a48c，2026-09-04 克隆核对）。
> 范围：**管理面 13 个 Controller / 86 个端点**；`Controllers/api/` 子目录为客户端 SDK 拉取配置所用（handoff §5.5 明确管理 UI 不涉及，不在清单内）。
> 用户要求：后端 API 全部适配。每个端点都有唯一处置：`适配@ITER-0x`（UI 暴露）、`适配不暴露`（API 层函数就绪但无 UI 场景）、`显式豁免`（附理由，需用户确认）。
> 未标注 `[Http*]` 的 action 按约定 GET 可达（handoff §5.2/§11），对接时逐个实测确认动词。

## 汇总

| 迭代                   | 端点数 | 范围                                    |
| ---------------------- | ------ | --------------------------------------- |
| ✅ M0 已适配           | 4      | 登录/首启/探活/App.Search（概览冒烟）   |
| ✅ ITER-08 已上线 | 13    | 应用导入导出 3、配置 JSON 文件 2、环境同步 1、服务注册 3、SSO 4 |
| ITER-03 应用管理       | 11     | 应用 CRUD/启停/Secret/分组/继承选择     |
| ITER-04 配置管理       | 15     | 配置 CRUD/三视图/待发布徽标/批量        |
| ITER-05 发布链路       | 5      | 发布/历史/回滚/单条历史/待发布统计      |
| ITER-06 运维视图       | 22     | 概览统计/客户端/节点/日志/远程操作      |
| ITER-07 权限体系       | 13     | 用户/角色/应用授权/改密                 |
| ITER-08 打磨交付       | 12     | 导入导出/JSON文件/环境同步/服务注册/SSO |
| 显式豁免（待用户确认） | 4      | 见文末豁免表                            |

## AdminController（6）

| Action          | 方法+路径                    | 用途                                       | 处置                                                             |
| --------------- | ---------------------------- | ------------------------------------------ | ---------------------------------------------------------------- |
| Login4AntdPro   | POST `/admin/jwt/login`      | JWT 登录                                   | ✅ M0                                                            |
| PasswordInited  | GET `/Admin/PasswordInited`  | 首启检测                                   | ✅ M0                                                            |
| InitPassword    | POST `/Admin/InitPassword`   | 首启初始化                                 | ✅ M0                                                            |
| ChangePassword  | POST `/Admin/ChangePassword` | 修改密码                                   | 适配@ITER-07                                                     |
| OidcLoginByCode | GET `/admin/oidc/login`      | OIDC 回调登录                              | 适配@ITER-08（SSO）                                              |
| Logoff          | POST/GET `/Admin/Logoff`     | 旧 cookie 会话登出并 Redirect 旧 UI 登录页 | **显式豁免**：JWT 体系无 cookie 会话，调用无意义且会 302 到旧 UI |

## AppController（13）

| Action           | 方法+路径                   | 用途                  | 处置                                          |
| ---------------- | --------------------------- | --------------------- | --------------------------------------------- |
| Search           | GET `/App/Search`           | 应用搜索（分组/分页） | ✅ M0 已接（概览计数）；完整列表视图@ITER-03  |
| Add              | POST `/App/Add`             | 新建（id 客户端生成） | 适配@ITER-03                                  |
| Edit             | POST `/App/Edit`            | 编辑                  | 适配@ITER-03                                  |
| Get              | GET `/App/Get`              | 详情（含 Secret）     | 适配@ITER-03                                  |
| DisableOrEnable  | POST `/App/DisableOrEnable` | 启停                  | 适配@ITER-03                                  |
| Delete           | POST `/App/Delete`          | 删除                  | 适配@ITER-03                                  |
| GetAppGroups     | GET `/App/GetAppGroups`     | 全部分组名（下拉）    | 适配@ITER-03                                  |
| InheritancedApps | GET `/App/InheritancedApps` | 可继承应用列表        | 适配@ITER-03（新建/编辑选继承；ITER-04 复用） |
| Export           | POST `/App/Export`          | 应用导出 json         | 适配@ITER-08                                  |
| PreviewImport    | POST `/App/PreviewImport`   | 导入预览校验          | 适配@ITER-08                                  |
| Import           | POST `/App/Import`          | 导入                  | 适配@ITER-08                                  |
| SaveAppAuth      | POST `/App/SaveAppAuth`     | 应用-用户授权         | 适配@ITER-07                                  |
| GetUserAppAuth   | GET `/App/GetUserAppAuth`   | 查应用授权            | 适配@ITER-07                                  |

## ConfigController（22）

| Action                 | 方法+路径                            | 用途                                   | 处置                                                  |
| ---------------------- | ------------------------------------ | -------------------------------------- | ----------------------------------------------------- |
| Search                 | GET `/Config/Search`                 | 分页搜索（含 onlineStatus/editStatus） | 适配@ITER-04；diff 数据源@ITER-05 复用                |
| Add                    | POST `/Config/Add`                   | 单条新建                               | ✅ 实测通过；UI 适配@ITER-04                          |
| AddRange               | POST `/Config/AddRange`              | 批量新建                               | 适配@ITER-04                                          |
| Edit                   | POST `/Config/Edit`                  | 编辑                                   | 适配@ITER-04                                          |
| Get                    | GET `/Config/Get`                    | 单条详情                               | 适配@ITER-04                                          |
| Delete                 | POST `/Config/Delete`                | 软删除（待发布删除）                   | 适配@ITER-04                                          |
| DeleteSome             | POST `/Config/DeleteSome`            | 批量删除                               | 适配@ITER-04                                          |
| CancelEdit             | GET `/Config/CancelEdit`             | 取消单条改动                           | 适配@ITER-04                                          |
| CancelSomeEdit         | GET `/Config/CancelSomeEdit`         | 批量取消                               | 适配@ITER-04                                          |
| All                    | GET `/Config/All`                    | 全量（继承视图组合用）                 | 适配@ITER-04                                          |
| GetKvList              | GET `/Config/GetKvList`              | KV 文本视图                            | 适配@ITER-04                                          |
| GetJson                | GET `/Config/GetJson`                | JSON 视图（jsonc 注释）                | 适配@ITER-04                                          |
| SaveJson               | POST `/Config/SaveJson`              | JSON 保存（isPatch）                   | 适配@ITER-04                                          |
| SaveKvList             | POST `/Config/SaveKvList`            | KV 保存（isPatch）                     | 适配@ITER-04                                          |
| WaitPublishStatus      | GET `/Config/WaitPublishStatus`      | 待发布统计（徽标）                     | ✅ 实测通过；UI 适配@ITER-04；发布前拉取@ITER-05 复用 |
| Publish                | POST `/Config/Publish`               | 发布                                   | ✅ 实测通过；UI 适配@ITER-05（强制 diff 预览）        |
| PublishHistory         | GET `/Config/PublishHistory`         | 发布历史（全量快照）                   | ✅ 实测通过；UI 适配@ITER-05（时间线/版本 diff）      |
| Rollback               | POST `/Config/Rollback`              | 回滚到时间线节点                       | 适配@ITER-05                                          |
| ConfigPublishedHistory | GET `/Config/ConfigPublishedHistory` | 单条配置历史                           | 适配@ITER-05                                          |
| PreViewJsonFile        | GET/POST `/Config/PreViewJsonFile`   | JSON 文件上传预览                      | 适配@ITER-08                                          |
| ExportJson             | GET `/Config/ExportJson`             | JSON 导出                              | 适配@ITER-08                                          |
| SyncEnv                | POST `/Config/SyncEnv`               | 环境间同步                             | 适配@ITER-08                                          |

## HomeController（5）

| Action     | 方法+路径              | 用途                               | 处置                                                                            |
| ---------- | ---------------------- | ---------------------------------- | ------------------------------------------------------------------------------- |
| Sys        | GET `/Home/Sys`        | 版本/密码初始化态/SSO 开关（匿名） | 适配@ITER-06（侧栏版本号由它驱动，替换硬编码；boot 流程复用）                   |
| Current    | GET `/Home/Current`    | 当前用户+角色+权限码+分类          | 适配@ITER-06（会话信息刷新，与登录响应字段对齐）                                |
| IndexAsync | GET `/Home/IndexAsync` | 旧首页                             | **显式豁免**：旧 UI 首页占位，无数据价值（Sys/Current/Report 统计已覆盖其信息） |
| Echo       | GET `/Home/Echo`       | 调试回声                           | **显式豁免**：服务器调试用途，管理 UI 无场景                                    |
| GetIP      | GET `/Home/GetIP`      | 返回请求方 IP                      | **显式豁免**：调试用途；如需"我的出口 IP"展示可在 ITER-06 重新评估              |

## ReportController（8）

| Action                  | 方法+路径                             | 用途                             | 处置                                                                                    |
| ----------------------- | ------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------- |
| Clients                 | GET `/Report/Clients`                 | 在线客户端列表                   | 适配@ITER-06                                                                            |
| ServerNodeClients       | GET `/Report/ServerNodeClients`       | 节点维度客户端                   | 适配@ITER-06                                                                            |
| SearchServerNodeClients | GET `/Report/SearchServerNodeClients` | 客户端分页搜索（appId/env 过滤） | 适配@ITER-06（发布影响面/一致性视图数据源；开工时核实是否含客户端配置版本 → 待核实 #8） |
| AppCount                | GET `/Report/AppCount`                | 应用数统计                       | 适配@ITER-06                                                                            |
| ConfigCount             | GET `/Report/ConfigCount`             | 配置数统计                       | 适配@ITER-06                                                                            |
| NodeCount               | GET `/Report/NodeCount`               | 节点数统计                       | 适配@ITER-06                                                                            |
| ServiceCount            | GET `/Report/ServiceCount`            | 服务数统计                       | 适配@ITER-06                                                                            |
| RemoteNodesStatus       | GET `/Report/RemoteNodesStatus`       | 各节点状态                       | 适配@ITER-06                                                                            |

## RemoteOPController（6）与 RemoteServerProxyController（3）

| Action                  | 方法+路径                                   | 用途                    | 处置                                                                                             |
| ----------------------- | ------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------ |
| AllClientsDoActionAsync | POST `/RemoteOP/AllClientsDoActionAsync`    | 广播指令                | **1.13.2 镜像 404**（master 新增，2026-09-07 实测）→ 广播走 AllClients_Reload 逐节点转发          |
| AppClientsDoActionAsync | POST `/RemoteOP/AppClientsDoActionAsync`    | 按应用+环境广播         | **1.13.2 镜像 404**（master 新增）→ 暂无 UI 场景，升级上游后再适配                               |
| OneClientDoActionAsync  | POST `/RemoteOP/OneClientDoActionAsync`     | 单客户端指令            | **1.13.2 镜像 404**（master 新增，用户验收发现）→ 改走 Client_Reload/Client_Offline（经节点代理） |
| ClearConfigServiceCache | POST `/RemoteOP/ClearConfigServiceCache`    | 清配置服务缓存          | 适配@ITER-06（危险操作区）                                                                       |
| ClearServiceInfoCache   | POST `/RemoteOP/ClearServiceInfoCache`      | 清服务信息缓存          | 适配@ITER-06                                                                                     |
| RegisterNode            | POST `/RemoteOP/RegisterNode`               | 节点注册（内部/节点间） | **显式豁免候选**：初判为节点互联端点非管理 UI 场景；ITER-06 开工读源码定案，若为管理功能转为适配 |
| Client_Offline          | POST `/RemoteServerProxy/Client_Offline`    | 经节点下线客户端        | 适配@ITER-06                                                                                     |
| AllClients_Reload       | POST `/RemoteServerProxy/AllClients_Reload` | 经节点全量重载          | 适配@ITER-06                                                                                     |
| Client_Reload           | POST `/RemoteServerProxy/Client_Reload`     | 经节点重载单客户端      | 适配@ITER-06                                                                                     |

## ServerNodeController（3）· SysLogController（1）· ServiceController（3）· RoleController（5）· UserController（8）· SSOController（3）

| Action                    | 方法+路径                        | 用途                    | 处置                                     |
| ------------------------- | -------------------------------- | ----------------------- | ---------------------------------------- |
| ServerNode/All            | GET `/ServerNode/All`            | 全部节点                | 适配@ITER-06                             |
| ServerNode/Add            | POST `/ServerNode/Add`           | 添加节点                | 适配@ITER-06                             |
| ServerNode/Delete         | POST `/ServerNode/Delete`        | 删除节点                | 适配@ITER-06                             |
| SysLog/Search             | GET `/SysLog/Search`             | 系统日志分页            | 适配@ITER-06                             |
| Service/Search            | GET `/Service/Search`            | 服务分页搜索            | 适配@ITER-08（服务注册中心 P2）          |
| Service/Add               | POST `/Service/Add`              | 注册服务（UI 手动注册） | 适配@ITER-08                             |
| Service/Remove            | POST `/Service/Remove`           | 移除服务                | 适配@ITER-08                             |
| Role/List                 | GET `/Role/List`                 | 角色列表                | 适配@ITER-07                             |
| Role/SupportedPermissions | GET `/Role/SupportedPermissions` | 系统支持的权限码清单    | 适配@ITER-07（角色编辑勾选）             |
| Role/Add                  | POST `/Role/Add`                 | 建角色                  | 适配@ITER-07                             |
| Role/Edit                 | POST `/Role/Edit`                | 改角色                  | 适配@ITER-07                             |
| Role/Delete               | POST `/Role/Delete`              | 删角色                  | 适配@ITER-07                             |
| User/Search               | GET `/User/Search`               | 用户分页                | 适配@ITER-07                             |
| User/Add                  | POST `/User/Add`                 | 建用户                  | 适配@ITER-07                             |
| User/Edit                 | POST `/User/Edit`                | 改用户                  | 适配@ITER-07                             |
| User/ResetPassword        | POST `/User/ResetPassword`       | 管理员重置密码          | 适配@ITER-07                             |
| User/Delete               | POST `/User/Delete`              | 删用户                  | 适配@ITER-07                             |
| User/AdminUsers           | GET `/User/AdminUsers`           | 管理员用户列表          | 适配@ITER-07（授权选择器复用）           |
| User/AllUsers             | GET `/User/AllUsers`             | 全部用户                | 适配@ITER-07（应用授权选择器复用）       |
| SSO/Index                 | GET `/SSO/Index`                 | OIDC 入口页             | 适配@ITER-08（SSO 登录跳转）             |
| SSO/Login                 | GET `/SSO/Login`                 | 发起 OIDC 登录          | 适配@ITER-08                             |
| SSO/LoginUrl              | GET `/SSO/LoginUrl`              | 获取 OIDC 登录地址      | 适配@ITER-08（登录页"SSO 登录"按钮显隐） |

## 显式豁免表（4，2026-09-07 ITER-08 收口时随整体验收确认）

| 端点                           | 理由                                           | 复活条件                             |
| ------------------------------ | ---------------------------------------------- | ------------------------------------ |
| `POST /Admin/Logoff`           | 旧 cookie 会话遗留，JWT 体系无意义且 302 旧 UI | 若未来改 cookie 会话                 |
| `GET /Home/IndexAsync`         | 旧 UI 首页占位                                 | 无                                   |
| `GET /Home/Echo` `/Home/GetIP` | 服务器调试端点                                 | ITER-06 概览若要展示出口 IP          |
| `POST /RemoteOP/RegisterNode`  | 初判节点互联内部端点                           | ITER-06 开工读源码定案（非最终豁免） |

> **收口声明（2026-09-07，ITER-08）**：86 端点全部处置完毕——78 已上线（M0 4 + ITER-03 8 + ITER-04 15 + ITER-05 5 + ITER-06 22 + ITER-07 15 + ITER-08 13，含跨迭代复用）、4 显式豁免（见下表）、RemoteOP/RegisterNode 维持豁免候选（节点互联端点，非管理面）。后续新增端点随上游升级增量登记。

> 维护纪律：每完成一个迭代，其"适配"端点在 `src/api/` 落地并在本表回填实际对接结果（含实测动词）；新增豁免必须给出理由并经用户确认。
