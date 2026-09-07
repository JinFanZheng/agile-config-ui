---
name: agileconfig-ops
description: Operate an AgileConfig configuration-center server over its HTTP admin API (facts verified against upstream 1.13.2). Covers apps, config items (table/KV/JSON), pending changes, publish, rollback, online clients, server nodes, service registry, and system logs. Use when the user mentions AgileConfig（配置中心）and wants to 查询/新建/修改/删除/发布/回滚 应用或配置、看待发布统计、列在线客户端/节点/服务、下线客户端、注册/移除服务、查系统日志，或要求用 curl/脚本直接调用 AgileConfig 服务端（本机实例默认 http://localhost:5017）。提供 JWT 登录流程、响应信封约定、与 API 全量清单对齐的端点速查表和字段级实测坑位。
---

# AgileConfig 运维操作（agileconfig-ops）

对 AgileConfig（.NET 配置中心，锁定版本 **1.13.2**）实例做查询与变更的操作手册。
端点路径/方法与仓库 `docs/API_INVENTORY.md`（86 端点全量清单）逐条对齐；坑位来自本机实例实测。
依赖：`curl` + `jq`。

## 1. 触发

管理 AgileConfig 的任何对象时使用本 skill：**应用 / 配置项 / 待发布与发布 / 回滚 / 在线客户端 / 节点 / 服务注册 / 系统日志**。
不在速查表内的端点（用户/角色/SSO/导入导出等）去源仓库 `docs/API_INVENTORY.md` 查，不要凭记忆猜。

## 2. 连接与认证

- Base URL 一律走环境变量 `BASE_URL`（本机实例示例 `http://localhost:5017`；其他环境由用户提供，禁止硬编码）。
- 路由为 MVC 约定 `/{Controller}/{Action}`，控制器/动作名首字母大写；唯一例外：登录是小写 `/admin/jwt/login`。
- 登录换 JWT（**24h 有效，无刷新机制**；401 = 重登）：

```bash
export BASE_URL=http://localhost:5017
TOKEN=$(jq -nc '{userName: env.AC_USER, password: env.AC_PASSWORD}' \
  | curl -sS -X POST "$BASE_URL/admin/jwt/login" \
      -H 'Content-Type: application/json' -d @- \
  | jq -r '.token')
```

- 后续请求统一带 `Authorization: Bearer $TOKEN`。
- 登录响应：`{"status":"ok","token":...,"type":"Bearer","currentAuthority":[角色],"currentFunctions":[权限码]}`；失败 `{"status":"error","message":"密码错误"}`。
- 状态码语义：**401** = 未带/过期 token（探测用 `App/Search` 等鉴权端点；`Report/*` 与 `Home/Sys` 是匿名端点，不会 401）；**403 且响应体为空** = 有 token 但无权限。

**凭证纪律（硬约束，任何情况下不破例）**：

- 真实密码只从 gitignored 的 env 文件读——本机即 `agile-config-ui` 仓库根的 `.env.e2e`，由主会话/用户加载并导出为 `AC_USER` / `AC_PASSWORD`；skill 使用者只消费这两个变量。
- 密码**绝不出现在命令行参数**（上面 `jq env.AC_PASSWORD` + 管道 `curl -d @-` 的写法就是为此：值经环境变量→stdin，全程不进 argv）、不写进任何输出、文档、脚本、日志、commit。
- token 与应用 secret（`App/Get` 会返回）同样不回显全文、不落盘。

## 3. 信封约定

| 形态 | 结构 | 适用 |
| --- | --- | --- |
| **信封** | `{"success":bool,"message":string,"data":T}`；`success:false` 时 `message` 为服务端原文 | 多数端点（速查表逐条标注） |
| **分页信封** | `{"current","pageSize","total","success","data":[...]}` | Search 类；请求参数 query `current`（默认 1）/`pageSize`（默认 20） |
| **裸 JSON** | 无信封，直接返回体 | 登录（`{status,token,...}`）、`Home/Sys`、`Home/Current`、`Report/Clients`、`Report/*Count`、`Report/RemoteNodesStatus` |

判定规则：先看速查表标注；没标注的常规 GET/POST 默认按信封处理，解包前用 `jq 'if has("success") then . else error("bare") end'` 之类自检。

## 4. 高频端点速查（约 20 个，与 API_INVENTORY 逐条核对）

信封列：`信封` = `{success,message,data}`；`分页` = 分页信封；`裸` = 裸 JSON。
`env` 取值来自 `Home/Sys` 的 `envList`（如 DEV/TEST/PROD），环境语义不可写错；`envList` 实测可能为 `null`（未配置多环境），此时回退默认 `DEV/TEST/PROD`。

**登录**：见 §2（POST `/admin/jwt/login`，裸）。

### 应用

| 端点 | 用途 | 关键参数 | 信封 | 备注 |
| --- | --- | --- | --- | --- |
| GET `/App/Search` | 应用搜索 | query `name,id,group,sortField,ascOrDesc,tableGrouped,current,pageSize` | 分页 | `tableGrouped=true` 按分组嵌套 |
| POST `/App/Add` | 新建 | body `{id,name,group,enabled,inheritanced,inheritancedApps}` | 信封 | ⚠️ id 必填且服务端不生成；secret 也不自动生成 |
| POST `/App/Edit` | 编辑 | body 同 Add | 信封 | |
| POST `/App/Delete` | 删除 | query `id` | 信封 | 危险操作，见 §6 |
| GET `/App/Get` | 详情 | query `id` | 信封 | data 含 secret，不回显全文 |

### 配置

| 端点 | 用途 | 关键参数 | 信封 | 备注 |
| --- | --- | --- | --- | --- |
| GET `/Config/GetKvList` | KV 视图 | query `appId,env` | 信封 | data=`[{key,value}]`，key 形如 `group:key`；**空分组无前导冒号** |
| POST `/Config/SaveKvList` | KV 保存 | query `appId,env`；body `{str,isPatch}` | 信封 | `str`=整段 KV 文本；`isPatch=false` 全量语义见 §5 |
| GET `/Config/GetJson` | JSON 视图 | query `appId,env` | 信封 | data=jsonc 字符串（含描述注释） |
| POST `/Config/SaveJson` | JSON 保存 | query `appId,env`；body `{json,isPatch}` | 信封 | isPatch 语义同上 |
| POST `/Config/Add` | 单条新建 | query `env`；body ConfigVM（appId,group,key,value,description...） | 信封 | |
| POST `/Config/Edit` | 单条编辑 | query `env`；body ConfigVM | 信封 | last-write-wins，见 §5 |
| GET `/Config/WaitPublishStatus` | 待发布统计 | query `appId,env` | 信封 | data=`{addCount,editCount,deleteCount}` |
| GET `/Config/Search` | 配置分页 | query `appId,group,key,onlineStatus,env,current,pageSize` | 分页 | 行含 `editStatus/onlineStatus`（语义见 §5）；pageSize 可传大值一次拉全 |

### 发布

| 端点 | 用途 | 关键参数 | 信封 | 备注 |
| --- | --- | --- | --- | --- |
| POST `/Config/Publish` | 发布 | query `env`；body `{appId,log,ids?}` | 信封 | **data 为空**（仅 success/message）；省略 `ids`=发布全部待发布，传数组=部分发布 |
| GET `/Config/PublishHistory` | 发布历史 | query `appId,env` | 信封 | data=版本分组数组，每组 `{timelineNode{id,version,log,publishTime,publishUserName,env}, list[该版本全量快照]}`，已按版本倒序 |
| POST `/Config/Rollback` | 回滚 | query `publishTimelineId,env` | 信封 | 回滚生成新版本记录，不删历史；危险操作 |

### 客户端 / 节点 / 服务注册

| 端点 | 用途 | 关键参数 | 信封 | 备注 |
| --- | --- | --- | --- | --- |
| POST `/RemoteServerProxy/Client_Reload` | 重载单客户端 | query `address,clientId` | 信封 | 经节点代理；address=节点地址（见 §5 容器坑） |
| POST `/RemoteServerProxy/Client_Offline` | 下线单客户端 | query `address,clientId` | 信封 | 同上；危险操作 |
| GET `/ServerNode/All` | 全部节点 | — | 信封 | data=`[{address,remark,status,lastEchoTime}]`，status 1=在线 0=离线 |
| GET `/Service/Search` | 服务搜索 | query `serviceName,serviceId,status,current,pageSize` | 分页 | status 1=Healthy 0=Unhealthy |
| POST `/Service/Remove` | 移除服务 | query `id` | 信封 | 服务重新注册后才恢复发现；危险操作 |

**匿名只读（排障用）**：GET `/Home/Sys`（裸：appVer/passwordInited/envList/ssoEnabled...）、GET `/Report/Clients`（裸：在线客户端）。

## 5. 实测坑位（省掉重踩，全部来自 1.13.2 实测）

1. **EditStatus 枚举**：`0`=新增 / `1`=修改 / `2`=删除方向 / `10`=已提交无待发布；**OnlineStatus**：`0`=待发布(未上线) / `1`=已上线。编辑已上线项会把该行 onlineStatus 重置为 0——**行级判定一律以 editStatus 为准**（已上线 = editStatus≠0）。
2. **SaveKvList 字段名**是 `{str, isPatch}`（str=整段 KV 文本），SaveJson 是 `{json, isPatch}`——不要直觉发挥成 kv/list/text。
3. **ChangePasswordVM 字段**：新密码字段名是 `password`（不是 newPassword），完整 `{oldPassword, password, confirmPassword}`；`User/ResetPassword` 重置为固定默认密码 `123456`。
4. **RemoteOP 三端点 404**：`/RemoteOP/OneClientDoActionAsync`、`/AppClientsDoActionAsync`、`/AllClientsDoActionAsync` 是 master 新增，**1.13.2 镜像返回 404**——客户端重载/下线必须走 `/RemoteServerProxy/Client_Reload|Client_Offline|AllClients_Reload`（query 带 address=节点地址）。Docker 拓扑下 address 是**容器内可达地址**（如 `http://localhost:5000`，不是宿主 5017）；节点注册后约 30s echo 探活才置在线。
5. **空分组键无前导冒号**：GetKvList 的 key 形如 `group:key`；无分组的条目就是裸 `key`，没有 `:key` 前导冒号——解析时按"第一个冒号"切分要防空分组。
6. **GetKvList 返回 KeyValuePair[]**：data 是 `[{key,value}]` 数组，不是整段文本；要文本自己拼 `k=v` 行。
7. **isPatch=false 是全量模式**：未出现在本次提交里的既有配置会被标记**待发布删除**——大批量误删的头号来源；不确定就 `isPatch:true`。
8. 其他已实测行为：`App/Add` 空 id 报"应用Id不能为空"（id 客户端生成）；secret 为空则 SDK 连不上（也不自动生成）；未分配角色的新用户自动获得内置 Operator 角色；并发编辑 last-write-wins **无乐观锁**（覆盖前先比对 updateTime）；无专用 diff 端点（组合 `Config/Search` 状态字段 + `PublishHistory` 快照做 diff）；`Config/AddRange` 的 `group:key` 重复会报错。

## 6. 数据纪律

- **临时数据一律自建**：随机前缀命名（如 `ops_$(date +%s)_app`），用完必须清理（`App/Delete` 等）。
- **绝不碰 `demo_app`** 及一切非本次任务自建的应用/配置/服务/节点——不写、不删、不发布；只读也仅限用户明确要求时。
- **危险操作先列影响面再执行**（发布/回滚/删除/移除/下线/RemoteOP 清缓存）：
  - 发布前：`WaitPublishStatus` 计数 + 列出将发布条目；
  - 回滚前：`PublishHistory` 取目标版本快照，明示"将回到 vX"；
  - 删除/移除前：列出对象及关联；
  - 客户端操作前：列出受影响的客户端。
- 凭证纪律见 §2：密码/token/secret 不回显、不落盘、不进 argv。

## 7. 验证模式

**每个写操作后立即用只读端点回验**，不符即停：

| 刚做的写操作 | 回验方式 |
| --- | --- |
| 配置增/改/删 | `Config/Search`（或 GetKvList）核对条目 + `WaitPublishStatus` 核对计数 |
| 发布 | `WaitPublishStatus` 计数归零 + `PublishHistory` 出现新 `timelineNode`（log 对得上）+ 快照 `list` 内容正确 |
| 回滚 | `PublishHistory` 新版本 + `Config/Search` 值已恢复 |
| 应用增/删/改 | `App/Search` |
| 服务增/移除 | `Service/Search` |
| 客户端重载/下线 | `Report/Clients` / `Report/SearchServerNodeClients` |

- 回验不符 → **停止后续写操作**并报告差异，不要盲目重试写请求（last-write-wins 会静默覆盖）。
- **冷启动只读巡检序列**（验收连通性，全程无写）：`Home/Sys`（版本/环境表）→ §2 登录 → `App/Search` 抽样 → `ServerNode/All` → `Report/Clients`。全绿才算就绪。

更多可直接复制的 curl 配方见同目录 `CHEATSHEET.md`。
