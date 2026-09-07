# AgileConfig 运维 curl 配方（CHEATSHEET）

> 前置：已读 SKILL.md；`curl` + `jq` 可用；`BASE_URL`、`AC_USER`、`AC_PASSWORD` 已由用户/主会话导出。
> 凭证纪律：密码只经 `env.*` + stdin 传递（见登录配方），绝不进 argv、不打印、不落盘。
> 端点事实源：`docs/API_INVENTORY.md`（1.13.2，86 端点全量清单）；坑位详见 SKILL.md §5。

## 0. 登录与探测（冷启动序列，只读）

```bash
export BASE_URL=http://localhost:5017   # 本机示例；实际地址由用户提供

# 匿名探测：版本 / 首启状态 / 环境列表（裸 JSON，无需 token）
curl -sS "$BASE_URL/Home/Sys" | jq '{appVer, passwordInited, envList, ssoEnabled}'

# 登录（密码经 env + stdin，全程不进 argv）
TOKEN=$(jq -nc '{userName: env.AC_USER, password: env.AC_PASSWORD}' \
  | curl -sS -X POST "$BASE_URL/admin/jwt/login" \
      -H 'Content-Type: application/json' -d @- \
  | jq -r '.token')
# 登录失败时上面会得到 "null"，先排查：jq -r '.status,.message' 看原文

# 探测 token 有效（鉴权端点，401=无效）
curl -sS "$BASE_URL/App/Search?pageSize=1" -H "Authorization: Bearer $TOKEN" | jq '{success,total}'

# 节点与在线客户端（巡检收尾）
curl -sS "$BASE_URL/ServerNode/All"   -H "Authorization: Bearer $TOKEN" | jq '.data'
curl -sS "$BASE_URL/Report/Clients"   -H "Authorization: Bearer $TOKEN" | jq '.clientCount'
```

## 1. 应用

```bash
# 列应用（分页信封）
curl -sS "$BASE_URL/App/Search?current=1&pageSize=50" -H "Authorization: Bearer $TOKEN" \
  | jq '.data[] | {id,name,group,enabled,inheritanced}'

# 自建临时应用（随机前缀，用完必须清理）
APP_ID="ops_$(date +%s)_app"
jq -nc --arg id "$APP_ID" \
  '{id:$id, name:("ops 临时 "+$id), group:"ops", enabled:true, inheritanced:false, inheritancedApps:[]}' \
| curl -sS -X POST "$BASE_URL/App/Add" \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d @-
# ⚠️ id 必填且服务端不生成；secret 也不会自动生成（为空则 SDK 连不上）

# 编辑（body 同 Add 结构）
jq -nc --arg id "$APP_ID" '{id:$id, name:"新名字", group:"ops", enabled:false, inheritanced:false, inheritancedApps:[]}' \
| curl -sS -X POST "$BASE_URL/App/Edit" \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d @-

# 详情（data 含 secret，不要回显全文）
curl -sS "$BASE_URL/App/Get?id=$APP_ID" -H "Authorization: Bearer $TOKEN" | jq '.data | {id,name,enabled}'

# 删除（危险操作：仅删自建应用；删前列出对象）
curl -sS -X POST "$BASE_URL/App/Delete?id=$APP_ID" -H "Authorization: Bearer $TOKEN"

# 回验
curl -sS "$BASE_URL/App/Search?id=$APP_ID" -H "Authorization: Bearer $TOKEN" | jq '.total'   # 期望 0
```

## 2. 配置（单条 + KV + JSON）

```bash
ENV=DEV   # 环境取值以 Home/Sys 的 envList 为准，别写错

# 单条新建（信封）
jq -nc --arg app "$APP_ID" --arg key "timeout" --arg val "30" \
  '{appId:$app, group:"", key:$key, value:$val, description:"ops 临时"}' \
| curl -sS -X POST "$BASE_URL/Config/Add?env=$ENV" \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d @-

# 单条编辑（last-write-wins：覆盖前先比对服务端 updateTime）
CONFIG_ID=<Config/Search 拿到的 id>
jq -nc --arg app "$APP_ID" --arg id "$CONFIG_ID" --arg val "60" \
  '{appId:$app, id:$id, group:"", key:"timeout", value:$val}' \
| curl -sS -X POST "$BASE_URL/Config/Edit?env=$ENV" \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d @-

# 搜索（分页信封；行含 editStatus/onlineStatus，语义见 SKILL.md §5）
curl -sS "$BASE_URL/Config/Search?appId=$APP_ID&env=$ENV&current=1&pageSize=100" \
  -H "Authorization: Bearer $TOKEN" \
| jq '.data[] | {id, group, key, value, editStatus, onlineStatus}'

# KV 视图（data=[{key,value}]，key 形如 group:key；空分组无前导冒号）
curl -sS "$BASE_URL/Config/GetKvList?appId=$APP_ID&env=$ENV" -H "Authorization: Bearer $TOKEN" \
| jq '.data'

# KV 保存（字段就是 {str,isPatch}；str=整段文本；不确定就 isPatch:true，false=全量会删掉缺项）
jq -nc --arg str $'timeout=60\nretries=3' '{str:$str, isPatch:true}' \
| curl -sS -X POST "$BASE_URL/Config/SaveKvList?appId=$APP_ID&env=$ENV" \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d @-

# JSON 视图 / 保存（字段 {json,isPatch}）
curl -sS "$BASE_URL/Config/GetJson?appId=$APP_ID&env=$ENV" -H "Authorization: Bearer $TOKEN" | jq -r '.data'
jq -nc --arg json '{"timeout":60}' '{json:$json, isPatch:true}' \
| curl -sS -X POST "$BASE_URL/Config/SaveJson?appId=$APP_ID&env=$ENV" \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d @-

# 待发布统计（data={addCount,editCount,deleteCount}）
curl -sS "$BASE_URL/Config/WaitPublishStatus?appId=$APP_ID&env=$ENV" -H "Authorization: Bearer $TOKEN"
```

## 3. 发布 / 回滚（危险操作：先列影响面）

```bash
# 发布前：统计 + 列出将发布条目（editStatus: 0=新增 1=修改 2=删除方向）
curl -sS "$BASE_URL/Config/WaitPublishStatus?appId=$APP_ID&env=$ENV" -H "Authorization: Bearer $TOKEN"
curl -sS "$BASE_URL/Config/Search?appId=$APP_ID&env=$ENV&pageSize=200" -H "Authorization: Bearer $TOKEN" \
| jq '.data[] | select(.editStatus != 10 and .editStatus != null) | {id, key, editStatus}'

# 全量发布（省略 ids = 发布全部待发布；响应无 data，只看 success/message）
jq -nc --arg app "$APP_ID" '{appId:$app, log:"ops: 发布说明"}' \
| curl -sS -X POST "$BASE_URL/Config/Publish?env=$ENV" \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d @-

# 部分发布（body 加 ids 数组，只发勾选项）
jq -nc --arg app "$APP_ID" --argjson ids '["<configId1>","<configId2>"]' \
  '{appId:$app, ids:$ids, log:"ops: 部分发布"}' \
| curl -sS -X POST "$BASE_URL/Config/Publish?env=$ENV" \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d @-

# 回验：计数归零 + 新版本出现（timelineNode.log 对得上）
curl -sS "$BASE_URL/Config/WaitPublishStatus?appId=$APP_ID&env=$ENV" -H "Authorization: Bearer $TOKEN"
curl -sS "$BASE_URL/Config/PublishHistory?appId=$APP_ID&env=$ENV" -H "Authorization: Bearer $TOKEN" \
| jq '.data[0].timelineNode'

# 回滚（危险：先取目标版本快照明示"将回到 vX"，再执行；回滚会生成新版本，不删历史）
TIMELINE_ID=<PublishHistory 里的 timelineNode.id>
curl -sS -X POST "$BASE_URL/Config/Rollback?publishTimelineId=$TIMELINE_ID&env=$ENV" \
  -H "Authorization: Bearer $TOKEN"
# 回验：Config/Search 值恢复 + PublishHistory 多一个新版本
```

## 4. 客户端 / 节点 / 服务注册

```bash
# 节点列表（data=[{address,remark,status,lastEchoTime}]，status 1=在线）
curl -sS "$BASE_URL/ServerNode/All" -H "Authorization: Bearer $TOKEN" | jq '.data'

# 客户端动作（经节点代理；⚠️ Docker 拓扑下 address 是容器内可达地址，不是宿主端口）
NODE_ADDR=<ServerNode/All 的 address>   # 如 http://localhost:5000
CLIENT_ID=<Report/Clients 的 id>
curl -sS -X POST "$BASE_URL/RemoteServerProxy/Client_Reload?address=$NODE_ADDR&clientId=$CLIENT_ID" \
  -H "Authorization: Bearer $TOKEN"      # 危险操作：先列出受影响客户端
curl -sS -X POST "$BASE_URL/RemoteServerProxy/Client_Offline?address=$NODE_ADDR&clientId=$CLIENT_ID" \
  -H "Authorization: Bearer $TOKEN"
# 注意：RemoteOP/OneClientDoActionAsync 等三端点在 1.13.2 是 404，别用

# 服务注册（分页信封；status 1=Healthy 0=Unhealthy）
curl -sS "$BASE_URL/Service/Search?current=1&pageSize=20" -H "Authorization: Bearer $TOKEN" \
| jq '.data[] | {id, serviceId, serviceName, status}'
# 移除服务（危险操作；服务重新注册后才恢复发现）
curl -sS -X POST "$BASE_URL/Service/Remove?id=<serviceId>" -H "Authorization: Bearer $TOKEN"
# 回验
curl -sS "$BASE_URL/Service/Search?serviceId=<serviceId>" -H "Authorization: Bearer $TOKEN" | jq '.total'
```

## 5. 系统日志（只读）

```bash
curl -sS "$BASE_URL/SysLog/Search?current=1&pageSize=20" -H "Authorization: Bearer $TOKEN" \
| jq '.data[] | {logTime, logType, appId, logText}'   # logType 0=Normal 1=Warn
```
