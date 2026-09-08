# ITER-27 一键安装脚本（引导配置）

> 状态：✅ VERIFIED（原 EVIDENCE_READY，2026-09-08 全生命周期实测通过）。

## 1. 目标

- `install.sh`：非交互可用（flag/环境变量），交互模式逐步引导；安装=生成自包含部署目录（compose+.env）→ 拉镜像起栈 → 健康检查 → **API 初始化管理员密码** → 打印访问信息
- 引导项：对外端口（默认 8080）、数据库（sqlite 零配置 / mysql 容器）、管理员密码（可自动生成）、可选 SSO（redirectUri 按端口自动拼，授权/token 端点视角提示）
- 附带 `uninstall` / `upgrade` / `status`
- 设计取舍：**只发布前端一个端口**（backend 不对外，全部经同源反代，SSO 回调天然成立）；数据持久化卷（区别于演示栈）；sqlite 用绝对路径 /data + 卷

## 2. 任务

| Task | 内容 | Verify |
| ---- | ---- | ---- |
| T-01 | scripts/install.sh（约 260 行 bash） | 本机非交互装一套（独立端口避让演示栈）→ 健康/登录/llms.txt 验证 → uninstall 清净 |
| T-02 | README 快速开始加"方式零"、文档地图登记 | 文档链接检查 |

## 3. 验收记录（2026-09-08）

- 全生命周期实测（独立端口避让演示栈）：install（起栈→健康→API 初始化 admin 密码→摘要）→ 登录 API `status:ok`、/llms.txt charset ✓ → status（从 .env 回读端口显示实例信息）→ upgrade（含 nginx DNS 刷新顺序修复）→ uninstall（数据卷清理零残留）。
- sqlite 用 `/data` 绝对路径 + 具名卷持久化；mysql 模式容器自带 + healthcheck；**只发布前端一个端口**（backend 同源反代，SSO 回调语义天然成立）；SSO 可装时配或后补（.env + upgrade），redirectUri 按端口自动拼。
- 实测修掉的三个脚本坑（供后人抄底）：① 动词分支漏 shift → 参数循环死转；② bash 中 `$VAR` 紧邻全角字符会把多字节并进变量名（set -u 报 unbound）→ 一律 `${VAR}`；③ status/upgrade 必须从生成的 .env 回读端口而非依赖 flag；④ upgrade 先刷 frontend DNS 再健康检查（backend 重建换 IP 的反代 502 坑）。
- README 增"方式零"、docs/README 登记。

## 5. 验收后增强（2026-09-08）

一行命令体验：`curl -fsSL .../scripts/install.sh | bash` **即装即用且保留交互引导**——管道执行时 stdin 自动接回终端（`exec 0</dev/tty`，无终端的 CI/重定向环境自动保持非交互默认，rustup 同款 idiom）；空密码摘要改"浏览器首启"引导（正式采纳"脚本管容器、页面管应用"分层）；`--yes` 让 uninstall 也能一行。
验证：Python pty 自建伪终端按提示动态应答（4 项全回车默认）——引导逐项出现与应答、安装完成、健康 200/passwordInited:false、一行卸载零残留；顺手修掉管道下 `--help` 失效（$0=bash 导致 sed 无文件，改内置 heredoc）。README 方式零改为一行为主。
