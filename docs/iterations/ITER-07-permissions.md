# 迭代卡 ITER-07 - 权限体系（M5）

> 状态：验收中（EVIDENCE_READY，2026-09-07 实现与自动化门全绿，等待用户验收）
> GR 复审：PASS（安全修复级：RG-4 越权 negative tests + fail-closed；oracle=受限账号 E2E + 用户验收）
> 变更分类：大改（安全面：权限/凭证）
> 方案出处：handoff §6 P1 + §10 M5 + UX #9；API 见 [../API_INVENTORY.md](../API_INVENTORY.md)
> 日期：2026-09-04 建卡 / 未开始
> Goal 审查：PENDING（开工复审；安全修复级审查）
> 依赖：ITER-03..06（按钮级权限作用于既有功能位）

## 1. 目标与范围

- 做什么：用户管理（建/改/删/重置密码/搜索）；角色管理（建/改/删 + 权限码勾选，数据源 SupportedPermissions）；应用授权（哪些用户可管理哪些应用）；**按钮级权限**（currentFunctions 驱动隐藏/禁用，落地到既有全部页面）；修改自己密码（顶栏入口启用）
- 不做什么：SSO（ITER-08）
- 完成定义：受权限账号登录后无权按钮不可用（E2E 用受限角色验证）；管理员可完成授权闭环

### 1.1 Goal 定义

| Goal | 用户/系统结果                                                          | Baseline / 当前差距              | Closure rule                            | Owner |
| ---- | ---------------------------------------------------------------------- | -------------------------------- | --------------------------------------- | ----- |
| G0   | 权限模型全量落地：管理员可管理用户/角色/应用授权，无权用户看不见做不了 | 仅登录时有权限码数据，无控制落地 | 受限账号 E2E（看不到/调不了）+ 用户验收 | Codex |

### 1.2 API 覆盖（13 端点，详见 API_INVENTORY）

- User：`Search`、`Add`、`Edit`、`ResetPassword`、`Delete`、`AdminUsers`、`AllUsers`
- Role：`List`、`SupportedPermissions`、`Add`、`Edit`、`Delete`
- App 授权：`SaveAppAuth`、`GetUserAppAuth`
- Admin：`ChangePassword`（顶栏"修改密码"启用）

## 2. 任务草案

| Task | 内容                                                                       | Verify                   |
| ---- | -------------------------------------------------------------------------- | ------------------------ |
| T-01 | `usePermission(code)` hook + 全站按钮位接入清单（逐页登记）                | 清单评审 + 单测          |
| T-02 | 用户管理页 + 重置密码（敏感操作审计到日志）                                | E2E                      |
| T-03 | 角色管理页（权限码矩阵勾选）                                               | E2E                      |
| T-04 | 应用授权（应用详情内嵌，复用 AllUsers）                                    | E2E                      |
| T-05 | 修改自己密码（弹窗，旧密码校验）                                           | E2E                      |
| T-06 | 受限角色 E2E（新建只读角色账号：无权按钮隐藏/禁用、直调 API 403/无权提示） | `docs/evidence/ITER-07/` |

## 3. Release Gates（要点，安全修复级）

RG-4 Security：越权场景（无权账号直调受保护端点）negative tests；fail-closed（权限码缺失=不可用，而非默认放开）；RG-5 L-Real（真实实例建受限账号）；RG-7 全量回归

## 4. 风险

- 权限码与页面功能的映射表需要完整梳理（SupportedPermissions 返回清单为准），避免漏控
- 前端隐藏只是体验，真正的防线在服务端（如实告知用户，不夸大前端权限控制）


## 5. 验收记录（2026-09-07）

- Baseline：@9435be2（59 unit + 17 e2e 全绿）
- 事实定案（源码+实测）：权限码 30 个（APP_/CONFIG_/…/LOG_ 大写）；服务端 PermissionCheck 拒绝返回 **403 空内容**；**User/ResetPassword 重置为固定默认密码 "123456"**（UI 明示并提醒改密）；回滚的服务端权限码是 CONFIG_OFFLINE（非 PUBLISH）
- T-01：`api/access.ts` 15 端点；`lib/permissions.ts` 码表；`hooks/usePermission`（fail-closed）
- T-02（子代理并行第二轮）：A=用户管理页（增删改/角色多选/重置密码明示 123456/删末条回页）；B=角色管理页（**权限矩阵**：按域分组+组内全选+半选态，系统角色不可编辑删除）；各自 typecheck/lint 零错误交付
- T-03：应用授权弹窗（AppsPage 行"授权"，APP_AUTH 门控，勾选用户保存）；修改密码弹窗（UserMenu 启用，旧密码校验+确认）
- T-04：按钮级权限 fail-closed 全站接入——应用（增/改/启停/删/授权）、配置（增/行内编辑/删除/取消/发布）、KV/JSON 保存、回滚（CONFIG_OFFLINE）、节点（增/删/重载）、客户端（重载/下线/广播/清缓存）、侧栏导航按页级权限码过滤（用户/角色入口上线）
- T-05：E2E `access.spec.ts`——只读角色（APP/CONFIG/LOG_READ）登录：无权导航 5 项不显示、新建/编辑/删除/授权/发布/行操作全隐藏、**绕过 UI 直调 /App/Add → 403**（真正防线验证）；自建角色/用户 afterAll 清理
- 门禁：typecheck ✓ / lint 0 ✓ / vitest 59 ✓ / playwright **18/18**（+1 安全 negative）✓ / build ✓
- Evidence：`docs/evidence/ITER-07/`（users/roles/权限矩阵/应用授权 ×4 截图）
- 集成修复：AppsPage 行操作门控初次替换未命中（prettier 格式差异）导致"授权"缺失——E2E 快照发现后修正；清理调试残留应用 5 个
- 诚实标注：前端隐藏是体验层，越权防线在服务端（403 已验证）；编辑用户时已删除角色的陈旧关联会被静默丢弃（子代理 A 记录，Backlog B-05）
- 自测（2026-09-07，用户委托）：门禁 59+18 全绿；双账号浏览器走查发现并修复**改密失效 bug**（ChangePasswordVM 字段名）；实测确认服务端行为：**未分配角色的新用户自动获得 Operator 角色**（APP/CONFIG 域全套权限）——非缺陷，已回写 handoff；新建用户如需限制必须显式分配角色
