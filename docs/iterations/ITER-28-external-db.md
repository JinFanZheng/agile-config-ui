# ITER-28 install.sh 外部 MySQL 与鲁棒性

> 状态：验收中（EVIDENCE_READY，2026-09-08 三组矩阵实测通过）。

## 1. 目标

- 外部 MySQL：`--db mysql --mysql-host H`（或交互选择"外部实例"）即外部模式；host/port/db/user/pass 可配
- 鲁棒性四件套：
  1. **装前预检**（fail-fast）：连通性 + 认证测试（本地 mysql 客户端优先，缺则借 mysql:8.4 镜像跑），可选自动 `CREATE DATABASE IF NOT EXISTS ... utf8mb4`，失败给人话（拒连/密码错/库不存在）
  2. **连接串转义**：特殊字符密码（`; ' @ $`）按 MySqlConnector 单引号包裹 + `''` 转义，端到端验证
  3. **启动失败诊断**：健康检查超时 → backend 日志尾 + 外部库场景专项提示清单
  4. **Linux 兼容**：backend 加 `extra_hosts: host.docker.internal:host-gateway`（外部库在本机时容器可达）
- 测试矩阵（真实外部 mysql:8.4 容器）：A 特殊字符密码+自动建库全链路；B 错误密码 fail-fast；C 拒绝建库+库缺失 → 诊断输出

## 2. 任务

| Task | 内容 | Verify |
| ---- | ---- | ---- |
| T-01 | 脚本扩展（参数/引导/预检/转义/诊断/extra_hosts） | 矩阵 A/B/C 实测 |

## 3. 验收记录（2026-09-08，真实外部 mysql:8.4 容器矩阵）

- **A 特殊字符全链路 ✓**：外部库密码 `Ex't;pa$1`（含 ' ; $）——预检连接认证 → 库缺失自动建（utf8mb4）→ 起栈健康 → 登录 `status:ok`（连接串单引号包裹 + `''` 转义端到端有效）；卸载零残留
- **B fail-fast ✓**：错误密码 → 秒退「认证失败：用户/密码不对（root@host:3307）」，不产生安装目录/容器
- **C 诊断 ✓**：`--no-create-db` + 库缺失 → 预检警告 → backend 健康超时 → 日志尾 + 外部库三项诊断提示（地址视角/账号权限/凭证核对）
- 实测发现的坑与修法（记录供抄底）：① bash `$VAR` 紧邻任意非 ASCII 字节（含破折号——）都会并进变量名 → 全文件正则兜底 `${VAR}`；② mysql 镜像 entrypoint 拼接 SQL，root 密码含 `'` 时初始化即挂 → 测试环境用两段式（简单密码 init + `ALTER USER` 换密）；③ 客户端预检本机无 mysql 时自动借 mysql:8.4 镜像
- Linux 兼容：backend 恒加 `extra_hosts: host.docker.internal:host-gateway`（外部库在宿主时必需；mac 无害）
- **复验补丁（用户追问"外部模式 compose 带不带 mysql"触发复查）**：初版有两处生成缺陷——①外部模式漏排除 bundled 段，compose 残留无人使用的 mysql 容器与 db-data 卷；②修正①时外部连接串赋值嵌在被跳过的分支内，backend 收到"mysql provider + sqlite 连接串"错配（MySqlConnector 按 Unix Socket 解析 /data/agile_config.db，启动即挂）。重构为 sqlite/bundled/external 三态 elif 后全绿：外部=仅 frontend+backend 两容器、仅 backend-data 卷、健康 200、外部库 16 表、卸载零残留；sqlite 路径回归通过（bundled 分支字节未变）。教训：生成器类代码的验收必须检查**产物**（compose 服务/卷清单），仅看运行结果会漏掉"多余但无害"的缺陷。
