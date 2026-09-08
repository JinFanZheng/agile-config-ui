#!/usr/bin/env bash
# agile-config-ui 一键安装（引导配置）
# 用法：
#   ./install.sh                       # 交互引导安装
#   ./install.sh install [选项]        # 非交互安装（选项见下）
#   ./install.sh uninstall             # 停止并删除（含数据卷，需确认）
#   ./install.sh upgrade               # 拉新镜像滚动更新（保留数据）
#   ./install.sh status                # 查看运行状态与访问信息
# 选项：
#   --port N           对外端口（默认 8080；backend 不对外，全部同源反代）
#   --db sqlite|mysql  数据库（默认 sqlite 零配置；mysql=容器自带，数据持久化）
#   --admin-pass P     管理员密码（缺省交互询问或自动生成）
#   --dir PATH         安装目录（默认 ./agile-config）
#   --image TAG        前端镜像（默认 ghcr.io/jinfanzheng/agile-config-ui:latest）
#   --sso-*            见 --help（九项 OIDC，通常装好后改 <dir>/.env 再 upgrade）
set -euo pipefail

FRONT_IMAGE_DEFAULT="ghcr.io/jinfanzheng/agile-config-ui:latest"
BACKEND_IMAGE="kklldog/agile_config:latest"
MYSQL_IMAGE="mysql:8.4"
VERB="install"

log()  { printf '\033[1;32m[install]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[warn]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m[error]\033[0m %s\n' "$*" >&2; exit 1; }

usage() { sed -n '2,16p' "$0"; exit 0; }

# ---------- 参数 ----------
PORT=8080; DB=sqlite; ADMIN_PASS=""; DIR=""; FRONT_IMAGE="$FRONT_IMAGE_DEFAULT"
PORT_SET=0; DB_SET=0  # 显式 flag 提供的项不再交互提问
SSO_ARGS=0; SSO_CLIENT_ID=""; SSO_CLIENT_SECRET=""; SSO_AUTH_EP=""; SSO_TOKEN_EP=""
SSO_USER_CLAIM=sub; SSO_USER_NAME_CLAIM=preferred_username; SSO_SCOPE="openid profile"
SSO_AUTH_METHOD=client_secret_post; SSO_BUTTON="SSO 登录"; SSO_ENABLED=false

while [ $# -gt 0 ]; do
  case "$1" in
    install) VERB=install; shift ;;
    uninstall|upgrade|status) VERB="$1"; shift ;;
    --help|-h) usage ;;
    --port) PORT="$2"; PORT_SET=1; shift 2 ;;
    --db) DB="$2"; DB_SET=1; shift 2 ;;
    --admin-pass) ADMIN_PASS="$2"; shift 2 ;;
    --dir) DIR="$2"; shift 2 ;;
    --image) FRONT_IMAGE="$2"; shift 2 ;;
    --sso-client-id) SSO_CLIENT_ID="$2"; SSO_ARGS=1; shift 2 ;;
    --sso-client-secret) SSO_CLIENT_SECRET="$2"; SSO_ARGS=1; shift 2 ;;
    --sso-auth-endpoint) SSO_AUTH_EP="$2"; SSO_ARGS=1; shift 2 ;;
    --sso-token-endpoint) SSO_TOKEN_EP="$2"; SSO_ARGS=1; shift 2 ;;
    --sso-user-id-claim) SSO_USER_CLAIM="$2"; shift 2 ;;
    --sso-user-name-claim) SSO_USER_NAME_CLAIM="$2"; shift 2 ;;
    --sso-scope) SSO_SCOPE="$2"; shift 2 ;;
    --sso-auth-method) SSO_AUTH_METHOD="$2"; shift 2 ;;
    --sso-button-text) SSO_BUTTON="$2"; shift 2 ;;
    *) die "未知参数 $1（--help 查看用法）" ;;
  esac
done
DIR="${DIR:-$PWD/agile-config}"
ENV_FILE="$DIR/.env"; COMPOSE_FILE="$DIR/docker-compose.yml"

# ---------- 前置检查 ----------
preflight() {
  command -v docker >/dev/null || die "未找到 docker（本脚本基于 Docker 部署）"
  docker compose version >/dev/null 2>&1 || die "未找到 docker compose v2"
  command -v jq >/dev/null || die "未找到 jq（brew install jq / apt install jq）"
  if [ "$VERB" = install ]; then
    lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1 && die "端口 $PORT 已被占用"
    if [ "$SSO_ARGS" = 1 ]; then
      [ -n "$SSO_CLIENT_ID" ] && [ -n "$SSO_CLIENT_SECRET" ] && [ -n "$SSO_AUTH_EP" ] && [ -n "$SSO_TOKEN_EP" ] \
        || die "SSO 需要至少 --sso-client-id/-secret/-auth-endpoint/-token-endpoint"
      SSO_ENABLED=true
    fi
  fi
}

# ---------- 交互引导 ----------
ask() { # ask "提示" "默认值" → 输出答案
  local ans; read -r -p "$1 [$2]: " ans || true; echo "${ans:-$2}"
}
guide() {
  [ -t 0 ] || return 0  # 非终端（CI/管道）：全部走默认
  echo "—— 引导配置（回车取默认值）——"
  [ "$PORT_SET" = 1 ] || PORT=$(ask "  对外访问端口" "$PORT")
  [ "$DB_SET" = 1 ] || DB=$(ask "  数据库 sqlite=零配置 / mysql=容器自带" "$DB")
  [ "$DB" = mysql ] || [ "$DB" = sqlite ] || die "数据库只能是 sqlite 或 mysql"
  if [ -z "$ADMIN_PASS" ]; then
    read -r -p "  管理员密码（回车=自动生成）: " ADMIN_PASS || true
    [ -n "$ADMIN_PASS" ] || ADMIN_PASS="agc-$(openssl rand -hex 6 2>/dev/null || echo $RANDOM$RANDOM)"
  fi
  if [ "$SSO_ARGS" != 1 ]; then
    local want; read -r -p "  现在配置 SSO/OIDC 吗？（后续可改 <dir>/.env 后 ./install.sh upgrade） [y/N]: " want || true
    if [ "${want:-N}" = y ] || [ "${want:-N}" = Y ]; then
      SSO_CLIENT_ID=$(ask "    OIDC clientId" "")
      SSO_CLIENT_SECRET=$(ask "    OIDC clientSecret" "")
      echo "    授权端点=浏览器可达地址；token 端点=本机容器可达地址（如 IdP 也在 docker 网络内）"
      SSO_AUTH_EP=$(ask "    authorizationEndpoint" "")
      SSO_TOKEN_EP=$(ask "    tokenEndpoint" "")
      SSO_USER_CLAIM=$(ask "    userIdClaim" "$SSO_USER_CLAIM")
      SSO_USER_NAME_CLAIM=$(ask "    userNameClaim" "$SSO_USER_NAME_CLAIM")
      SSO_SCOPE=$(ask "    scope" "$SSO_SCOPE")
      SSO_AUTH_METHOD=$(ask "    tokenEndpointAuthMethod" "$SSO_AUTH_METHOD")
      SSO_BUTTON=$(ask "    按钮文案" "$SSO_BUTTON")
      SSO_ENABLED=true
    fi
  fi
}

# ---------- 生成部署目录 ----------
render() {
  mkdir -p "$DIR"
  [ -e "$COMPOSE_FILE" ] && die "$COMPOSE_FILE 已存在（upgrade 请用 ./install.sh upgrade）"
  local MYSQL_ROOT_PASS="agc-mysql-$(openssl rand -hex 4 2>/dev/null || echo $RANDOM)"
  cat > "$ENV_FILE" <<ENV
# 由 install.sh 生成 —— 改动后执行 ./install.sh upgrade 生效
FRONT_IMAGE=$FRONT_IMAGE
HOST_PORT=$PORT
ADMIN_USER=admin
DB=$DB
MYSQL_ROOT_PASS=$MYSQL_ROOT_PASS
ENV
  if [ "$SSO_ENABLED" = true ]; then
    cat >> "$ENV_FILE" <<ENV
SSO_ENABLED=true
SSO_BUTTON_TEXT=$SSO_BUTTON
SSO_CLIENT_ID=$SSO_CLIENT_ID
SSO_CLIENT_SECRET=$SSO_CLIENT_SECRET
SSO_AUTH_ENDPOINT=$SSO_AUTH_EP
SSO_TOKEN_ENDPOINT=$SSO_TOKEN_EP
SSO_USER_ID_CLAIM=$SSO_USER_CLAIM
SSO_USER_NAME_CLAIM=$SSO_USER_NAME_CLAIM
SSO_SCOPE=$SSO_SCOPE
SSO_AUTH_METHOD=$SSO_AUTH_METHOD
ENV
  else
    echo "SSO_ENABLED=false" >> "$ENV_FILE"
  fi

  local BACKEND_ENV SSO_ENV MYSQL_SERVICE BACKEND_DEP
  BACKEND_ENV='      - db__provider=${DB}
      - db__conn=Data Source=/data/agile_config.db'
  MYSQL_SERVICE=""; BACKEND_DEP=""
  if [ "$DB" = mysql ]; then
    MYSQL_SERVICE=$(cat <<'YML'
  db:
    image: mysql:8.4
    environment:
      - MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASS}
      - MYSQL_DATABASE=agile_config
    volumes:
      - db-data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "127.0.0.1", "-p${MYSQL_ROOT_PASS}"]
      interval: 3s
      timeout: 3s
      retries: 30
YML
)
    BACKEND_DEP="    depends_on:
      db:
        condition: service_healthy"
    BACKEND_ENV='      - db__provider=mysql
      - db__conn=Data Source=db;Port=3306;Database=agile_config;User ID=root;Password=${MYSQL_ROOT_PASS};Charset=utf8mb4'
  fi
  SSO_ENV=""
  if [ "$SSO_ENABLED" = true ]; then
    SSO_ENV='      # SSO 要点（详见仓库 docs/AGENT_HANDOFF.md §7.0）：redirectUri 必须是前端同源地址
      - SSO__enabled=${SSO_ENABLED}
      - SSO__loginButtonText=${SSO_BUTTON_TEXT}
      - SSO__OIDC__clientId=${SSO_CLIENT_ID}
      - SSO__OIDC__clientSecret=${SSO_CLIENT_SECRET}
      - SSO__OIDC__authorizationEndpoint=${SSO_AUTH_ENDPOINT}
      - SSO__OIDC__tokenEndpoint=${SSO_TOKEN_ENDPOINT}
      - SSO__OIDC__redirectUri=http://localhost:${HOST_PORT}/SSO/Index
      - SSO__OIDC__userIdClaim=${SSO_USER_ID_CLAIM}
      - SSO__OIDC__userNameClaim=${SSO_USER_NAME_CLAIM}
      - SSO__OIDC__scope=${SSO_SCOPE}
      - SSO__OIDC__tokenEndpointAuthMethod=${SSO_AUTH_METHOD}'
  fi

  cat > "$COMPOSE_FILE" <<YML
# 由 install.sh 生成（$(date '+%F %T')）。backend 不对外发布端口：一切经 frontend 同源反代（SSO 回调依赖此语义）。
services:
  frontend:
    image: \${FRONT_IMAGE}
    environment:
      - BACKEND=http://backend:5000
    ports:
      - "\${HOST_PORT}:80"
    depends_on:
      - backend

  backend:
    image: $BACKEND_IMAGE
    platform: linux/amd64
    environment:
      - TZ=Asia/Shanghai
      - adminConsole=true
$BACKEND_ENV
$SSO_ENV
    volumes:
      - backend-data:/data
$BACKEND_DEP

$MYSQL_SERVICE
volumes:
  backend-data:
  db-data:
YML
  # 修正：mysql 为空时遗留空 volumes 键
  [ "$DB" = sqlite ] && sed -i '' '/^  db-data:$/d' "$COMPOSE_FILE" 2>/dev/null || sed -i '/^  db-data:$/d' "$COMPOSE_FILE" || true
  log "部署目录已生成：$DIR"
}

# ---------- 生命周期 ----------
dc() { docker compose --project-directory "$DIR" -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"; }

# status/upgrade 未带 --port 时，从安装目录的 .env 读回实际端口
load_port_from_env() {
  [ -f "$ENV_FILE" ] || die "$DIR 下没有 .env"
  PORT=$(sed -n 's/^HOST_PORT=//p' "$ENV_FILE")
  [ -n "$PORT" ] || die ".env 中缺少 HOST_PORT"
}

wait_healthy() {
  local i
  for i in $(seq 1 60); do
    curl -sf "http://127.0.0.1:$PORT/Home/Sys" >/dev/null 2>&1 && return 0
    sleep 2
  done
  return 1
}

init_admin() {
  local body
  body=$(curl -s -X POST "http://127.0.0.1:$PORT/Admin/InitPassword" \
    -H 'Content-Type: application/json' \
    -d "{\"password\":\"$ADMIN_PASS\",\"confirmPassword\":\"$ADMIN_PASS\"}")
  echo "$body" | jq -e '.success == true or .message == "password already inited" or (.message // "" | test("已初始化|already|初始化"))' >/dev/null \
    && return 0
  warn "管理员密码初始化返回异常：$body（可稍后在页面完成首启初始化）"
}

summary() {
  echo
  echo "  ┌──────────────────────────────────────────────"
  echo "  │ 安装完成"
  echo "  │ 访问        http://localhost:$PORT"
  echo "  │ 管理员      admin / $ADMIN_PASS"
  echo "  │ 数据库      ${DB}（数据卷持久化）"
  [ "$SSO_ENABLED" = true ] && echo "  │ SSO         已配置（按钮文案：${SSO_BUTTON}）"
  echo "  │ 日常操作    cd $DIR 后："
  echo "  │   停止/卸载  $(basename "$0") uninstall --dir $DIR"
  echo "  │   升级      $(basename "$0") upgrade  --dir $DIR"
  echo "  │   改配置    编辑 .env 后 upgrade 生效"
  echo "  └──────────────────────────────────────────────"
}

do_install() {
  guide
  preflight
  render
  log "拉取镜像并启动（backend 较大约 354MB，首次稍等）…"
  dc up -d --quiet-pull
  log "等待服务就绪…"
  wait_healthy || { dc logs --tail 40 backend; die "服务未就绪，见上方日志"; }
  [ -n "$ADMIN_PASS" ] && init_admin
  summary
}

do_uninstall() {
  [ -f "$COMPOSE_FILE" ] || die "$DIR 下没有安装（找不到 docker-compose.yml）"
  echo "将停止并删除容器与数据卷（数据将丢失）：$DIR"
  local ok; read -r -p "确认？输入 yes: " ok || true
  [ "${ok:-}" = yes ] || die "已取消"
  dc down -v --remove-orphans
  rm -rf "$DIR"
  log "已卸载并清理 $DIR"
}

do_upgrade() {
  [ -f "$COMPOSE_FILE" ] || die "$DIR 下没有安装"
  dc pull >/dev/null 2>&1 || true
  dc up -d
  # backend 容器重建会换 IP：先刷新 frontend 的 nginx DNS 缓存（否则反代持续 502，实测坑），再做健康检查
  dc restart frontend >/dev/null
  wait_healthy || die "升级后健康检查失败"
  log "升级完成：http://localhost:$PORT"
}

do_status() {
  [ -f "$COMPOSE_FILE" ] || die "$DIR 下没有安装"
  dc ps
  curl -s "http://127.0.0.1:$PORT/Home/Sys" | jq -c '{appVer, passwordInited, ssoEnabled}' || warn "服务未响应"
}

case "$VERB" in
  install)   do_install ;;
  uninstall) preflight; do_uninstall ;;
  upgrade)   preflight; load_port_from_env; do_upgrade ;;
  status)    load_port_from_env; do_status ;;
esac
