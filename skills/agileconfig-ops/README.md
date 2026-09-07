# agileconfig-ops

AgileConfig（1.13.2）运维 skill：让任意新会话的 agent 无需读全量交接文档，即可快速、安全地管理 AgileConfig 实例（应用 / 配置 / 发布 / 回滚 / 客户端 / 节点 / 服务注册 / 日志）。

## 文件

| 文件 | 内容 |
| --- | --- |
| `SKILL.md` | 操作手册主体：触发、连接与认证、信封约定、约 20 个高频端点速查、实测坑位、数据纪律、验证模式 |
| `CHEATSHEET.md` | 可直接复制的 curl 配方（登录/应用/配置/发布回滚/客户端节点服务/日志） |

端点事实与仓库 `docs/API_INVENTORY.md`（86 端点全量清单）逐条对齐；上游差异以该清单为准，新增实测结论应回写清单（源仓库纪律）。

## 安装（用户级 skill 发现路径）

源文件随仓库版本化，安装 = 在 `~/.agents/skills/` 下建 symlink：

```bash
ln -s /Users/vanzheng/projects/ai-agent/agile-config-ui/skills/agileconfig-ops \
      ~/.agents/skills/agileconfig-ops
```

验证：

```bash
ls -la ~/.agents/skills/ | grep agileconfig-ops
# 应看到：agileconfig-ops -> /Users/vanzheng/projects/ai-agent/agile-config-ui/skills/agileconfig-ops
```

若 symlink 失败（权限/文件系统不支持），报告错误，不要改为复制安装（会造成两份漂移）；确需复制时必须在本 README 记录替代方案与同步责任。

## 凭证（安全）

skill 文件内不含任何真实密码。使用时由主会话/用户从 gitignored 的 env 文件（本机为仓库根 `.env.e2e`）导出 `AC_USER` / `AC_PASSWORD`，密码只经环境变量 + stdin 传递，绝不进命令行参数、文档、日志或 commit。详见 `SKILL.md` §2。
