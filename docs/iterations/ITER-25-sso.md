# ITER-25 SSO 补全：OIDC 回调落地 + 可配按钮文案 + Keycloak 端到端实测

> 状态：验收中（EVIDENCE_READY，2026-09-08 Keycloak 真实 IdP 全链路 PASS，等待用户过目）。
> 背景：核对坐实 SSO 只适配一半——入口显隐 ✓、回调落地 ✗（后端硬编码重定向官方 UI 的 `/ui#/oidc/login?code=`，我们的根路径 SPA 会丢弃 hash 中的 code）、可配按钮文案 ssoButtonText 未接。

## 1. 方案

| 项 | 实现 |
| --- | --- |
| 回调落地 | `lib/sso.ts` 纯函数解析 `#/oidc/login?code=`；main.tsx 挂载前异步兑换（`GET /admin/oidc/login?code=`，响应与密码登录同构）→ 写会话 → replaceState 清 `/ui`+hash 再渲染；失败静默落登录页 |
| 按钮文案 | LoginPage 接 `Home/Sys` 的 `ssoButtonText`（缺省回退默认文案） |
| 端到端 | 本地 Keycloak 容器（REST 建realm/client/user）→ backend 注入 SSO__OIDC__* 环境重建 → Playwright 走全链路：按钮（自定义文案）→ IdP 登录 → 回调 → 进入管理台 |

## 2. 服务端配置事实（fork 源码实证，进 handoff）

- appsettings `SSO:OIDC:*`（clientId/clientSecret/authorizationEndpoint/tokenEndpoint/redirectUri/userIdClaim/userNameClaim/scope/tokenEndpointAuthMethod）+ `SSO:loginButtonText`；Docker 环境变量 `SSO__OIDC__clientId` 等
- `ssoEnabled` = 配置齐全自动开启；回调 redirectUri 指向 `<host>/SSO/Index`
- 首登用户自动入库（Source=SSO，默认 Operator 角色）；`OidcLoginByCode` 响应与密码登录同构

## 3. 任务

| Task | 内容 | Verify |
| ---- | ---- | ------ |
| T-01 | sso.ts + api.oidcLoginByCode + main.tsx 引导 + ssoButtonText | 单测（hash 解析） |
| T-02 | Keycloak 端到端（evidence 脚本，SSO_E2E 门控） | 全链路登录成功 |

## 4. Gate 要点

GR-1 baseline @2c750ba；Keycloak/后端 SSO 配置均为一次性测试资源，测后拆除还原；常规 e2e 套件不依赖 keycloak。

## 4. 验收记录（2026-09-08）

- 实现：`lib/sso.ts`（hash 解析，+3 单测）+ `api.oidcLoginByCode`（JWT username claim 解码补会话）+ `main.tsx` 挂载前兑换引导 + 登录页 `ssoButtonText` 接线。
- **Keycloak 端到端 PASS**（真实 IdP，realm/client/user 全 REST 自动搭建）：登录页按钮（自定义文案）→ IdP 登录（sso_tester）→ backend `/SSO/Index` → `/ui#/oidc/login?code` → 本前端兑换 → 登录态落首页；导航链与会话用户名证据见 `evidence/ITER-25/`（e2e-sso.mjs 可复现，落地截图）。
- 实测修正两个理解：① `SSO:enabled` 是显式总开关（非配置齐全自动开）；② **redirectUri 必须指向前端同源**的 `/SSO/Index`（backend 回调重定向 PathBase+/ui#…，直指 backend 端口会被其自带官方 adminConsole 消费）；authorizationEndpoint 配浏览器可达、tokenEndpoint 配容器可达。已回写 handoff §7.0。
- Teardown：keycloak 容器与 backend SSO override 已拆除还原（ssoEnabled=false），常规全量 e2e **47/47**（无 IdP 下登录页无按钮，兼容）。
