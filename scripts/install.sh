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
#   --mysql-host H     外部 MySQL 主机（给出即外部库模式；容器视角，本机=host.docker.internal）
#   --mysql-port/db/user/pass   外部库连接项（默认 3306 / agile_config / root）
#   --no-create-db     不自动建库（默认预检时 CREATE DATABASE IF NOT EXISTS utf8mb4）
#   --sso-*            见 --help（九项 OIDC，通常装好后改 <dir>/.env 后 upgrade）
# 注意：upgrade 只更新镜像并使 .env 改动生效，不会重写 docker-compose.yml 模板——
#       install.sh 模板自身有更新时，需备份 .env 后重新 install（或手动对齐模板）。
set -euo pipefail

# 管道安装（curl | bash）也保留交互引导：把 stdin 接回终端（有终端才做，CI/重定向环境不受影响）
if [ ! -t 0 ] && [ -t 1 ]; then
  exec 0</dev/tty || true
fi

FRONT_IMAGE_DEFAULT="ghcr.io/jinfanzheng/agile-config-ui:latest"
BACKEND_IMAGE="kklldog/agile_config:latest"
MYSQL_IMAGE="mysql:8.4"
VERB="install"

log()  { printf '\033[1;32m[install]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[warn]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m[error]\033[0m %s\n' "$*" >&2; exit 1; }

usage() {
  cat <<'USAGE'
用法：
  ./install.sh                       # 交互引导安装
  ./install.sh install [选项]        # 非交互安装（选项见下）
  ./install.sh uninstall [--yes]     # 停止并删除（含数据卷；--yes 跳过确认）
  ./install.sh upgrade               # 拉新镜像滚动更新（保留数据）
  ./install.sh status                # 查看运行状态与访问信息
选项：
  --port N           对外端口（默认 8080；backend 不对外，全部同源反代）
  --db sqlite|mysql  数据库（默认 sqlite 零配置；mysql=容器自带，数据持久化）
  --mysql-host H     外部 MySQL 主机（给出即外部库模式；容器视角，本机=host.docker.internal）
  --mysql-port/db/user/pass   外部库连接项（默认 3306 / agile_config / root）
  --no-create-db     不自动建库（默认预检时 CREATE DATABASE IF NOT EXISTS utf8mb4）
  --sso-*            九项 OIDC，通常装好后改 <dir>/.env 后 upgrade
USAGE
  exit 0
}

# ---------- 参数 ----------
PORT=8080; DB=sqlite; ADMIN_PASS=""; DIR=""; FRONT_IMAGE="$FRONT_IMAGE_DEFAULT"
PORT_SET=0; DB_SET=0; ASSUME_YES=0  # 显式 flag 提供的项不再交互提问
MYSQL_EXTERNAL=0; MYSQL_HOST=""; MYSQL_PORT=3306; MYSQL_DB=agile_config; MYSQL_USER=root; MYSQL_PASS=""; MYSQL_CREATE_DB=1
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
    --mysql-host) MYSQL_HOST="$2"; MYSQL_EXTERNAL=1; shift 2 ;;
    --mysql-port) MYSQL_PORT="$2"; shift 2 ;;
    --mysql-db) MYSQL_DB="$2"; shift 2 ;;
    --mysql-user) MYSQL_USER="$2"; shift 2 ;;
    --mysql-pass) MYSQL_PASS="$2"; shift 2 ;;
    --no-create-db) MYSQL_CREATE_DB=0; shift ;;
    --yes) ASSUME_YES=1; shift ;;
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

# ---------- 外部 MySQL 工具 ----------
# MySqlConnector 连接串转义：值用单引号包裹、内部 ' 翻倍（密码含 ; ' @ $ 均安全）
esc_sq() { printf "%s" "$1" | sed "s/'/''/g"; }

# 预检一律容器视角（借 mysql:8.4 镜像跑客户端）：与 backend 同网络视角，
# 避免"宿主能连而容器连不上/反之"的错位——尤其 host.docker.internal 在 Linux 宿主上不存在（CI 实测抓到）
mysql_cmd() { echo "docker run --rm --add-host=host.docker.internal:host-gateway $MYSQL_IMAGE mysql"; }

check_external_mysql() {
  [ -n "$MYSQL_HOST" ] || die "外部库模式需要 --mysql-host"
  [ -n "$MYSQL_PASS" ] || die "外部库模式需要 --mysql-pass（交互模式会询问）"
  local CLI; CLI=$(mysql_cmd)
  log "预检外部 MySQL：$MYSQL_HOST:${MYSQL_PORT}（客户端：${CLI%% *}）"
  local err
  if ! err=$($CLI -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" -p"$MYSQL_PASS" -e 'SELECT 1' 2>&1); then
    case "$err" in
      *"Access denied"*|*1045*) die "认证失败：用户/密码不对（$MYSQL_USER@${MYSQL_HOST}:${MYSQL_PORT}）" ;;
      *"Can't connect"*|*"Connection refused"*|*2003*|*10061*) die "连不上 $MYSQL_HOST:${MYSQL_PORT}——检查地址/端口/防火墙（容器访问宿主库用 host.docker.internal）" ;;
      *) die "MySQL 预检失败：$err" ;;
    esac
  fi
  log "连接与认证 ✓"
  if ! $CLI -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" -p"$MYSQL_PASS" \
        -e "USE \`$MYSQL_DB\`" >/dev/null 2>&1; then
    if [ "$MYSQL_CREATE_DB" = 1 ]; then
      if $CLI -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" -p"$MYSQL_PASS" \
           -e "CREATE DATABASE IF NOT EXISTS \`$MYSQL_DB\` CHARACTER SET utf8mb4" >/dev/null 2>&1; then
        log "数据库 $MYSQL_DB 不存在，已自动创建（utf8mb4）✓"
      else
        die "数据库 $MYSQL_DB 不存在且无权创建——请先建库（utf8mb4）或换有权限账号"
      fi
    else
      warn "数据库 $MYSQL_DB 不存在且 --no-create-db：backend 启动将失败，请自行建库"
    fi
  else
    log "数据库 $MYSQL_DB ✓"
  fi
}

# ---------- 前置检查 ----------
preflight() {
  command -v docker >/dev/null || die "未找到 docker（本脚本基于 Docker 部署）"
  docker compose version >/dev/null 2>&1 || die "未找到 docker compose v2"
  command -v jq >/dev/null || die "未找到 jq（brew install jq / apt install jq）"
  if [ "$VERB" = install ]; then
    lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1 && die "端口 $PORT 已被占用"
    [ "$MYSQL_EXTERNAL" = 1 ] && check_external_mysql
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
  [ "$DB_SET" = 1 ] || DB=$(ask "  数据库 sqlite=零配置 / mysql=容器自带 / mysql-external=外部实例" "$DB")
  case "$DB" in
    sqlite|mysql) ;;
    mysql-external) DB=mysql; MYSQL_EXTERNAL=1 ;;
    *) die "数据库只能是 sqlite / mysql / mysql-external" ;;
  esac
  if [ "$DB" = mysql ] && [ "$DB_SET" = 0 ] && [ "$MYSQL_EXTERNAL" != 1 ]; then
    local ext; ext=$(ask "  MySQL 自带容器还是外部实例？ bundled=自带 / external=外部" bundled)
    [ "$ext" = external ] && MYSQL_EXTERNAL=1
  fi
  if [ "$MYSQL_EXTERNAL" = 1 ] && [ "$DB_SET" = 0 ]; then
    MYSQL_HOST=$(ask "  外部库主机（容器视角；库在本机则填 host.docker.internal）" "${MYSQL_HOST:-host.docker.internal}")
    MYSQL_PORT=$(ask "  端口" "$MYSQL_PORT")
    MYSQL_DB=$(ask "  库名" "$MYSQL_DB")
    MYSQL_USER=$(ask "  用户" "$MYSQL_USER")
    [ -n "$MYSQL_PASS" ] || { read -r -p "  密码: " MYSQL_PASS || true; }
  fi
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
DB_EXTERNAL=$MYSQL_EXTERNAL
MYSQL_ROOT_PASS=$MYSQL_ROOT_PASS
ENV
  if [ "$MYSQL_EXTERNAL" = 1 ]; then
    # 连接串里的值须做 MySqlConnector 转义（单引号包裹 + '' 翻倍），特殊字符密码端到端安全
    cat >> "$ENV_FILE" <<ENV
MYSQL_HOST=$MYSQL_HOST
MYSQL_PORT=$MYSQL_PORT
MYSQL_DB=$MYSQL_DB
MYSQL_USER_ESC=$(esc_sq "$MYSQL_USER")
MYSQL_PASS_ESC=$(esc_sq "$MYSQL_PASS")
ENV
  fi
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
  # 自带容器模式才渲染 db 服务与依赖；外部库模式只有 frontend+backend 两个容器
  if [ "$DB" = mysql ] && [ "$MYSQL_EXTERNAL" != 1 ]; then
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
  elif [ "$MYSQL_EXTERNAL" = 1 ]; then
    # 外部实例：仅 frontend+backend 两容器，连接串值带单引号转义（.env 存 MYSQL_*_ESC）
    BACKEND_ENV='      - db__provider=mysql
      - db__conn=Data Source=${MYSQL_HOST};Port=${MYSQL_PORT};Database=${MYSQL_DB};User ID='"'"'${MYSQL_USER_ESC}'"'"';Password='"'"'${MYSQL_PASS_ESC}'"'"';Charset=utf8mb4'
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
    # Linux 上让容器解析 host.docker.internal（访问宿主上的外部库）；Docker Desktop/OrbStack 自带、此行无害
    extra_hosts:
      - "host.docker.internal:host-gateway"
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
  # 仅"自带容器 mysql"模式才需要 db-data 卷；sqlite 与外部库模式删除该声明
  if [ "$DB" != mysql ] || [ "$MYSQL_EXTERNAL" = 1 ]; then
    sed -i '' '/^  db-data:$/d' "$COMPOSE_FILE" 2>/dev/null || sed -i '/^  db-data:$/d' "$COMPOSE_FILE" || true
  fi
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
  warn "管理员密码初始化返回异常：${body}（可稍后在页面完成首启初始化）"
}

summary() {
  echo
  echo "  ┌──────────────────────────────────────────────"
  echo "  │ 安装完成"
  echo "  │ 访问        http://localhost:$PORT"
  if [ -n "$ADMIN_PASS" ]; then
    echo "  │ 管理员      admin / ${ADMIN_PASS}"
  else
    echo "  │ 管理员      打开页面完成首启：设置 admin 密码后登录"
  fi
  echo "  │ 数据库      ${DB}（数据卷持久化）"
  [ "$SSO_ENABLED" = true ] && echo "  │ SSO         已配置（按钮文案：${SSO_BUTTON}）"
  echo "  │ 日常操作    cd $DIR 后："
  echo "  │   停止/卸载  $(basename "$0") uninstall --dir $DIR"
  echo "  │   升级      $(basename "$0") upgrade  --dir $DIR"
  echo "  │   改配置    编辑 .env 后 upgrade 生效"
  echo "  └──────────────────────────────────────────────"
}

do_install() {
  if [ ! -t 0 ]; then
    log "无终端模式：使用默认配置（端口 $PORT / sqlite / 浏览器首启设密码）；自定义请加参数（--help）"
  fi
  guide
  preflight
  render
  log "拉取镜像并启动（backend 较大约 354MB，首次稍等）…"
  dc up -d --quiet-pull
  log "等待服务就绪…"
  wait_healthy || {
    dc logs --tail 30 backend | tail -30
    if [ "$MYSQL_EXTERNAL" = 1 ]; then
      cat <<'HINT'
[诊断提示·外部 MySQL]
  1) 地址视角：backend 在容器内，库在本机请用 host.docker.internal（Linux 已自动加 host-gateway 映射）
  2) 账号权限：确认该用户可从任意主机连接（GRANT ... TO 'user'@'%'），且对库有建表权限
  3) 凭证/端口：重跑 ./install.sh install --db mysql --mysql-host ... 核对（装前预检会先验证连通与认证）
HINT
    fi
    die "服务未就绪，见上方日志与提示"
  }
  [ -n "$ADMIN_PASS" ] && init_admin
  summary
}

do_uninstall() {
  [ -f "$COMPOSE_FILE" ] || die "$DIR 下没有安装（找不到 docker-compose.yml）"
  if grep -q '^DB_EXTERNAL=1' "$ENV_FILE" 2>/dev/null; then
    echo "将停止并删除容器与本机卷（外部数据库的数据不受影响）：$DIR"
  else
    echo "将停止并删除容器与数据卷（数据将丢失）：$DIR"
  fi
  if [ "${ASSUME_YES:-0}" != 1 ]; then
    local ok; read -r -p "确认？输入 yes: " ok || true
    [ "${ok:-}" = yes ] || die "已取消"
  fi
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
