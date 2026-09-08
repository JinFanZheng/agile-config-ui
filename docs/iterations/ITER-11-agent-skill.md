# ITER-11 Agent 运维 Skill（agileconfig-ops）

> 状态：✅ VERIFIED（原 EVIDENCE_READY，2026-09-08 编写+安装+冷启动巡检通过，等待用户验收）

## 1. 目标

做一个 SKILL.md，让任意会话里的 agent 无需读全量交接文档即可**快速安全地管理本 AgileConfig 实例**（查/改/发布/回滚/运维操作）。

## 2. 位置与安装

- 源文件随仓库版本化：`skills/agileconfig-ops/SKILL.md`（+ 可选 cheatsheet 附录）
- 安装到用户级目录（ZCode/skill 体系发现路径，参照 skill-forge 实践）：`~/.agents/skills/agileconfig-ops/`（symlink 或复制，README 写明安装命令）

## 3. SKILL.md 内容骨架（浓缩自 AGENT_HANDOFF/API_INVENTORY/本项目实测）

1. **触发**：管理 AgileConfig（应用/配置/发布/客户端/节点/服务注册/日志）时使用
2. **连接与认证**：base URL 走 env（本机 `http://localhost:5017`）；`POST /admin/jwt/login {userName,password}` → Bearer；真实密码只读 `.env.e2e`，禁止写进任何输出
3. **信封约定**：部分端点裸 JSON、部分 `{success,data}`（速查表标注）
4. **高频端点速查（~20 个）**：应用 Search/Add/Edit/Delete；配置 GetKvList/SaveKvList/GetJson/SaveJson/Add/Edit/WaitPublishStatus；发布 Publish(range ids)/History/Rollback；客户端 RemoteServerProxy（Client_Reload/Offline）；节点 All；服务注册 Search/Remove
5. **实测坑位**（省掉 agent 重踩）：EditStatus=0/1/2/10；SaveKvList 字段 `{str,isPatch}`；ChangePasswordVM 字段 `password`；RemoteOP 三端点 404（master-only）→ 用 RemoteServerProxy；空分组键无前导冒号；GetKvList 返回 KeyValuePair[]；isPatch=false 全量会标记待发布删除
6. **数据纪律**：临时数据用随机前缀自建应用并清理；**绝不碰 `demo_app`**；危险操作（发布/回滚/删除）先列影响再执行
7. **验证模式**：操作后用只读端点回验（如 WaitPublishStatus、History）

## 4. 任务

| Task | 内容                                          | Verify                              |
| ---- | --------------------------------------------- | ----------------------------------- |
| T-01 | SKILL.md 编写（§3 骨架）+ 仓库内目录          | 新会话冷启动按 skill 完成一次只读巡检 |
| T-02 | 安装到 ~/.agents/skills/ 并验证被发现/触发     | `/agents` 或等价方式列出             |

## 5. Gate 要点

skill 内**不得含真实密码**（纪律第 2 条）；端点事实与 API_INVENTORY 一致，新增实测结论回写 API_INVENTORY（事实源纪律）；GR-9 左overs 归属。

## 6. 验收记录（2026-09-08）

- 实现（子代理 C）：`skills/agileconfig-ops/SKILL.md`（七节骨架齐全：触发/认证/信封/速查/坑位/纪律/回验）+ `CHEATSHEET.md` + `README.md`。速查 28 端点（要求 ~20：指定 19 + 登录 + 4 只读常用）逐条对 API_INVENTORY 核对路径/方法，信封经上游 1.13.2 源码复核。
- 事实修正：`WaitPublishStatus` 为 `{success,data}` 信封（handoff §5.4 原记裸 JSON）——已回写 handoff，并经主会话本机实测复核（keys=`["data","success"]`）。
- T-01 verify（冷启动只读巡检，主会话按 SKILL.md §7 执行）：Home/Sys → 登录（密码经 env→stdin）→ App/Search（demo_app 只读在场）→ ServerNode/All → Report/Clients → WaitPublishStatus，六步全绿；顺带核实 `envList=null` 回退行为并补进 skill §4。
- T-02 安装：`~/.agents/skills/agileconfig-ops` symlink 建立并可见；frontmatter 经 symlink 读取正常。skill 文件内无真实密码（自检通过）。
- 证据：docs/evidence/ITER-11/。
- 待用户验收（新会话实际触发一次 skill 可作为补充验收）。
