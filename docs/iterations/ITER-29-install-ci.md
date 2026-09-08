# ITER-29 install.sh 的 Linux CI 矩阵 + 模板升级语义定案

> 状态：✅ VERIFIED（原 EVIDENCE_READY，2026-09-08）。需求出处：用户"按你的建议推进"（遗漏清单的两项拍板）。

## 决策

- **模板不随 upgrade 重写**：定案为文档注明（无存量用户，不做迁移工具）——install.sh 头注释 + README 方式零均已注明"upgrade 只更新镜像与 .env 生效"。
- **CI 覆盖 Linux**：新增 `.github/workflows/install-matrix.yml`，三形态矩阵（sqlite / mysql-bundled / mysql-external）在 ubuntu runner 上跑完整生命周期。

## 矩阵内容（每 push/PR 自动）

1. 安装（非交互）→ 2. **生成器产物形态断言**（容器数 2/3/2、卷数 1/2/1，external 另断言外部库 16 表——正是上一轮"带病运行"缺陷的永久哨兵）→ 3. 功能（健康/登录/llms.txt charset）→ 4. upgrade（含 nginx DNS 刷新顺序）→ 5. 卸载三重零残留。external 用 host.docker.internal 验证 Linux host-gateway 行为。

## 验收记录（2026-09-08）

**矩阵三轮实战，前两轮各抓到一个 Linux 真雷（此 CI 的存在价值即被当场证明）**：
1. 首轮：外部库预检用宿主视角 mysql 客户端，Linux 宿主上 host.docker.internal 不存在 → 预检必挂（mac OrbStack 宿主恰好可解析，本机从未暴露）→ 预检改为**一律容器视角**（借 mysql:8.4 镜像）；
2. 二轮：预检一次性 docker run 缺 --add-host，Linux 默认 bridge 不自动解析该主机名（backend 的 compose 有 extra_hosts，部署侧一直没事）→ 补 `--add-host=host.docker.internal:host-gateway`；
3. 三轮：**三形态全绿**（sqlite/bundled/external），含产物形态断言（容器 2/3/2、卷 1/2/1、外部库 16 表）、功能验证、升级、卸载三重零残留。

sqlite/bundled 亦为 install.sh 在真实 Linux 环境的首证。
