# agile-config-ui 镜像：多阶段构建
# 阶段 1 —— node:22-alpine 构建 Vite 产物
# 阶段 2 —— nginx:alpine 静态托管 + 同源反代（部署契约见 nginx.conf 头注释）

FROM node:22-alpine AS build
WORKDIR /app

# 钉住 pnpm 9（与 pnpm-lock.yaml lockfileVersion 9.0 一致；pnpm 10 需 approve-builds，避免构建分歧）
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable pnpm && corepack prepare pnpm@9.12.0 --activate

# 先只拷依赖清单安装，源码变更不打散依赖层缓存
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# 再拷源码构建（.dockerignore 已排除 node_modules / dist / 凭证 env 等）
COPY . .
RUN pnpm build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
# 作为 envsubst 模板放下，启动时渲染为 default.conf（见 CMD）
COPY nginx.conf /etc/nginx/conf.d/default.conf.template

# 反代目标：可用 docker run -e BACKEND=... 或 compose environment 覆盖
ENV BACKEND=http://backend:5000

EXPOSE 80

# 只替换 ${BACKEND}：裸 envsubst 会把 nginx 自身的 $host/$remote_addr 等也清空
CMD ["sh", "-c", "envsubst '${BACKEND}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"]
