# ITER-20 证据 — MySQL 真实栈实测与生产崩溃修复

基线：@a09b097 之后工作区。收口：typecheck/lint ✓ / vitest **127** / 对 nginx 真实产物 e2e **42/42** + preview 哨兵 **3/3**。

## 崩溃现场与根因链（probe-kv-nginx.mjs 捕获）

1. `CONSOLE: Error handled by React Router default ErrorBoundary: Illegal value for token color: #fff`（monaco-CgGN8SMe.js tokenization.js `colorRegExp=/^#?([0-9A-Fa-f]{6})([0-9A-Fa-f]{2})?$/`）
2. 生产 CSS 实证（容器内 grep）：`--bg-panel:#fff`、`--accent-foreground:#fff`（lightningcss 压缩 #ffffff→#fff；dev 不压缩 → 常规 e2e 盲区）
3. standaloneThemeService.js:116-125：主题 `editor.background/foreground` 被降级为 token 规则再校验 → `applyMonacoTheme` 抛错 → 整页 ErrorBoundary 白屏（截图 ITER-20-crash-screenshot.png）
4. 修复：`src/lib/color.ts expandHex6()`（#fff→#ffffff），monaco.ts 全部颜色读取统一过它；单测 2 例

## MySQL 栈实测

- `docker compose -f docker-compose.yml -f docker-compose.mysql.yml up -d --build`
- `SHOW TABLES`：agc_app/agc_config/agc_config_published/agc_publish_timeline/agc_role 等 12 表（CodeFirst）
- 播种后 agc_app=1 / agc_config=2（SQL 计数）；nginx 首页 200；/llms.txt `text/plain; charset=utf-8`（生产实证）
- 修复后全量 e2e 42/42（修复前 36/1fail/3skip）+ preview 哨兵 3/3

## 数据库支持（源码 ProviderToFreesqlDbType 实证）

sqlite / mysql / sqlserver / npgsql|postgresql|pg / oracle

## 复现脚本

`../ITER-19/probe-kv-nginx.mjs`（崩溃捕获）、`../ITER-19/probe-vars.mjs`（压缩值实证）。
