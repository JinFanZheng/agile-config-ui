# ITER-11 Agent 运维 Skill（agileconfig-ops）

> 状态：PLANNED（2026-09-08 与用户约定）。产出物是 skill 文件，不是前端代码。

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
