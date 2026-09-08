# ITER-25 证据 — SSO 补全与 Keycloak 端到端

基线 @2c750ba。收口：vitest **134** / 常规全量 e2e **47/47** / SSO 全链路 PASS。

## 全链路导航链（真实 Keycloak 26 @ 8081，REST 自动建 realm/client/user）

```
1-2. 5173/login（SSO 按钮显示服务端可配文案"统一身份登录"）
3.   → 8081/realms/agile/.../auth（IdP 登录 sso_tester）
4-5. → 5173/ui#/oidc/login?code=xxx（backend /SSO/Index 重定向；本前端 nginx fallback 接住）
6-7. → 5173/（main.tsx 挂载前兑换 → 会话用户名 sso_tester，JWT username claim 解码）
```

截图 `sso-landed.png`；复现脚本 `e2e-sso.mjs`（前置：keycloak 容器 + backend SSO override，搭建/拆除命令见迭代卡）。

## 实测修正的理解（已回写 handoff §7.0）

1. `SSO:enabled` 显式总开关（非配置齐全自动开）
2. redirectUri 必须指**前端同源** `/SSO/Index`（直指 backend 端口会被其自带 /ui 官方 UI 消费——首跑实录）
3. authorizationEndpoint（浏览器可达）与 tokenEndpoint（容器可达）视角分离——次跑实录（host.docker.internal 浏览器不可解析）

## 配置样例（Keycloak 实测值）

backend env：`SSO__enabled=true`、`SSO__loginButtonText=统一身份登录`、`SSO__OIDC__clientId/clientSecret`、`SSO__OIDC__authorizationEndpoint=http://localhost:8081/realms/agile/protocol/openid-connect/auth`、`SSO__OIDC__tokenEndpoint=http://host.docker.internal:8081/.../token`、`SSO__OIDC__redirectUri=http://localhost:5173/SSO/Index`、`userIdClaim=sub`、`userNameClaim=preferred_username`、`scope=openid profile`、`tokenEndpointAuthMethod=client_secret_post`。
