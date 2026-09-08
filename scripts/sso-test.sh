#!/usr/bin/env bash
# SSO 一键测试（ITER-25）：Keycloak 真实 IdP 端到端。
# 前置：MySQL 演示栈已构建运行（docker-compose.yml + docker-compose.mysql.yml，前端含 ITER-25 代码）。
# 用法：
#   ./scripts/sso-test.sh up     # 起 Keycloak + backend 注入 SSO + REST 自动建 realm/client/user
#   ./scripts/sso-test.sh test   # Playwright 全链路自动验证（按钮→IdP→回调→兑换→登录态）
#   ./scripts/sso-test.sh down   # 拆除 Keycloak、backend 还原为无 SSO 演示栈
#   ./scripts/sso-test.sh all    # up + test + down 一条龙
set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.mysql.yml"
KC=http://localhost:8081

wait_keycloak() {
  for i in $(seq 1 60); do
    curl -sf "$KC/realms/master/.well-known/openid-configuration" >/dev/null 2>&1 && return 0
    sleep 2
  done
  echo "Keycloak 未就绪"; exit 1
}

provision() {
  local kt cid uid
  kt=$(curl -s -X POST "$KC/realms/master/protocol/openid-connect/token" \
    -d 'client_id=admin-cli&grant_type=password&username=kadmin&password=kpass-2026' | jq -r .access_token)
  # 幂等：409（已存在）视为成功
  code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$KC/admin/realms" -H "Authorization: Bearer $kt" \
    -H 'Content-Type: application/json' \
    -d '{"realm":"agile","enabled":true}')
  [ "$code" = 201 ] || [ "$code" = 409 ] || { echo "realm 创建失败 $code"; exit 1; }
  code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$KC/admin/realms/agile/clients" -H "Authorization: Bearer $kt" \
    -H 'Content-Type: application/json' \
    -d '{"clientId":"agileconfig","secret":"sso-secret","publicClient":false,"standardFlowEnabled":true,"directAccessGrantsEnabled":false,"redirectUris":["http://localhost:5173/SSO/Index"]}')
  [ "$code" = 201 ] || [ "$code" = 409 ] || { echo "client 创建失败 $code"; exit 1; }
  curl -s -o /dev/null -X POST "$KC/admin/realms/agile/users" -H "Authorization: Bearer $kt" -H 'Content-Type: application/json' \
    -d '{"username":"sso_tester","enabled":true,"email":"sso@test.local","firstName":"Sso","lastName":"Tester"}' || true
  uid=$(curl -s "$KC/admin/realms/agile/users?username=sso_tester" -H "Authorization: Bearer $kt" | jq -r '.[0].id')
  curl -s -o /dev/null -X PUT "$KC/admin/realms/agile/users/$uid/reset-password" -H "Authorization: Bearer $kt" \
    -H 'Content-Type: application/json' -d '{"type":"password","value":"Sso-Pass-2026","temporary":false}'
  echo "Keycloak 就绪：realm=agile client=agileconfig user=sso_tester / Sso-Pass-2026"
}

wait_backend() {
  for i in $(seq 1 30); do
    curl -sf http://localhost:5017/Home/Sys >/dev/null 2>&1 && return 0
    sleep 2
  done
  echo "backend 未就绪"; exit 1
}

case "${1:-all}" in
  up)
    $COMPOSE -f docker-compose.sso-test.yml up -d
    wait_keycloak && provision && wait_backend
    # backend 容器重建会换 IP：刷新 frontend 的 nginx DNS 缓存，否则反代持续 502（ITER-08 实录）
    $COMPOSE restart frontend
    echo "SSO 已开启：打开 http://localhost:5173/login 应见「统一身份登录」按钮"
    ;;
  test)
    node docs/evidence/ITER-25/e2e-sso.mjs
    ;;
  down)
    $COMPOSE up -d backend   # 无 SSO overlay 重建 backend 还原
    $COMPOSE -f docker-compose.sso-test.yml rm -sf keycloak
    wait_backend
    $COMPOSE restart frontend   # 同上：刷新 nginx DNS 缓存
    echo "已还原：$(curl -s http://localhost:5017/Home/Sys | jq -c '{ssoEnabled}')"
    ;;
  all)
    "$0" up && "$0" test && "$0" down
    ;;
  *) echo "用法：$0 {up|test|down|all}"; exit 1 ;;
esac
