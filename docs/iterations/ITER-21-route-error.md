# ITER-21 路由错误页与过期 chunk 自动恢复

> 状态：验收中（EVIDENCE_READY，2026-09-08 用户实测反馈驱动，nginx 真实产物 43/43）。
> 需求出处：用户截图反馈"有问题"——实为 ITER-20 镜像重建后旧标签页 chunk 失效露出 React Router 英文默认错误页。

## 1. 问题与方案

| 问题 | 方案 |
| --- | --- |
| 发版后旧标签页拉旧 hash chunk 404 | errorElement 检测 chunk 加载失败 → **自动整页刷新一次**（sessionStorage 10s 防循环），刷新即拿到新 index.html 自愈 |
| 英文默认错误页违反全中文纪律 | `RouterErrorPage` 三分支中文文案（应用已更新/页面不存在/意外错误）+ 刷新/返回首页按钮，令牌样式 |

## 2. 验收记录（2026-09-08）

- 单测 +2（数据路由器驱动）；e2e +1（拦截 chunk 模拟失效：中文页 + 单次自动刷新 + 无英文页）
- vitest 129 / nginx 全量 e2e 43/43 / build ✓
- 证据：docs/evidence/ITER-21/（用户截图 + 旧 chunk 404 实证）
- 待用户验收：硬刷新（Cmd+Shift+R）后正常；此后发版不再出现英文错误页
