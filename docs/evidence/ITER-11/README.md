# ITER-11 证据 — Agent 运维 Skill（agileconfig-ops）

产出：`skills/agileconfig-ops/SKILL.md`（七节骨架）+ `CHEATSHEET.md`（curl 配方）+ `README.md`（安装说明）。

## 端点事实核对

- 速查表 28 端点路径/方法经 `grep -F` 逐条对 `docs/API_INVENTORY.md` 验证一致；信封标注另经上游 1.13.2 源码（API_INVENTORY 基线 commit 741a48c 的本地克隆）核对。
- **发现并修正一处 handoff 事实出入**：`Config/WaitPublishStatus` 实为 `{success,data}` 信封（handoff §5.4 原记为裸 JSON），已回写 handoff；本机实测复核：响应 keys=`["data","success"]`。
- 冷启动巡检补充 nuance：本实例 `Home/Sys` 的 `envList` 为 `null`（未配置多环境），前端回退 `DEV/TEST/PROD`（handoff §5 #5 已核实），已补进 SKILL.md §4。

## 冷启动只读巡检（T-01 verify，2026-09-08 主会话按 SKILL.md §7 序列执行）

按 skill 自身指令冷启动，全程无写操作，密码经 `jq env.AC_PASSWORD` + stdin（不进 argv、不回显）：

1. `GET /Home/Sys` → appVer `1.13.2.0`、passwordInited true ✓
2. `POST /admin/jwt/login` → Bearer token（385 字符）✓
3. `GET /App/Search` → 分页信封，total=3（demo_app 只读在场，未做任何写）✓
4. `GET /ServerNode/All` → 信封，1 节点在线（address=`http://localhost:5000`，印证 skill §5 容器地址坑位）✓
5. `GET /Report/Clients` → 裸 JSON `{clientCount:0,infos:[]}`（信封三态标注正确）✓
6. `GET /Config/WaitPublishStatus?appId=demo_app&env=DEV` → keys=`["data","success"]`，信封修正获真机验证 ✓

## 安装与发现（T-02）

- `ln -s` 安装：`~/.agents/skills/agileconfig-ops -> <repo>/skills/agileconfig-ops`，`ls -la` 可见；经 symlink 路径读取 SKILL.md frontmatter 正常。
- 密码红线自检：skill 三文件内无真实密码（唯一 "123456" 为 `User/ResetPassword` 服务端固定默认密码的记载，handoff §5.5 已有结论）。
