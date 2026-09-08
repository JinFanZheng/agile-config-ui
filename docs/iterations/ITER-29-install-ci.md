# ITER-29 install.sh 的 Linux CI 矩阵 + 模板升级语义定案

> 状态：验收中（EVIDENCE_READY，2026-09-08）。需求出处：用户"按你的建议推进"（遗漏清单的两项拍板）。

## 决策

- **模板不随 upgrade 重写**：定案为文档注明（无存量用户，不做迁移工具）——install.sh 头注释 + README 方式零均已注明"upgrade 只更新镜像与 .env 生效"。
- **CI 覆盖 Linux**：新增 `.github/workflows/install-matrix.yml`，三形态矩阵（sqlite / mysql-bundled / mysql-external）在 ubuntu runner 上跑完整生命周期。

## 矩阵内容（每 push/PR 自动）

1. 安装（非交互）→ 2. **生成器产物形态断言**（容器数 2/3/2、卷数 1/2/1，external 另断言外部库 16 表——正是上一轮"带病运行"缺陷的永久哨兵）→ 3. 功能（健康/登录/llms.txt charset）→ 4. upgrade（含 nginx DNS 刷新顺序）→ 5. 卸载三重零残留。external 用 host.docker.internal 验证 Linux host-gateway 行为。

## 验收记录

见首轮 workflow 运行结果（本卡回填）。
