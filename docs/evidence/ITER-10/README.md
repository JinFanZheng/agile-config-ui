# ITER-10 证据 — 接入指南（网页直出）

基线：v1.0.0 @1b568f1（lint ✓ / vitest 88 通过）。收口后：typecheck ✓ / lint ✓ / vitest 103 通过（含 GuidePage 3 例）/ e2e 29 通过（含 guide 1 例）/ build ✓。

## G1/G2 页面可用与一键复制

- 截图（graphite 主题，锚点逐节）：`guide-section-quick-start / -csharp-sdk / -service-register / -pitfalls / -faq.png`；复制反馈：`guide-copy-feedback.png`（✓已复制 内联反馈，无 Toast）。
- 单测（`GuidePage.test.tsx` 3 例）：五分节标题+锚点 id；`pre > code` 纯文本渲染（无 HTML 注入面）+ 复制按钮反馈；坑位关键事实呈现（EditStatus 枚举 / "True" 归一化 / a:b:c）。
- e2e（`e2e/guide.spec.ts`）：路由可达、五节齐全、锚点跳转（末节滚动钳制下断言"滚入视区 + 目录高亮跟随"）、占位符可见、`grantPermissions(clipboard-*)` 下剪贴板内容=代码源码。

## G3 内容与实测事实一致（来源对照）

- C# SDK（Options/生命周期/ConfigChanged/ReLoaded 防御式写法）与服务注册（三心跳模式/DiscoveryService）逐段改写自 `tools/verify-client/Program.cs`；
- 秒级生效/探活时序/secret 坑 ← handoff §5 客户端实测补充；
- 冒号嵌套/数组索引键/归一化/空分组裸键 ← `src/lib/jsonDiff.ts` 及其测试（ITER-08 实测）；
- EditStatus/OnlineStatus/isPatch 全量语义/多环境/继承 ← handoff §5.4/§12。
- 占位符统一 `your-app-id` / `your-app-secret` / `http://your-node:5000`，无真实地址与凭证。

## 收口修复记录（主会话）

子代理实现后存在 5 处类型错误（`SetStateAction` 联合类型、testing-library `ByRoleOptions` 无 `exact`）与末节锚点滚动钳制问题（点 FAQ 高亮停在上一节），已由主会话修复：`SectionId` 类型收窄、`exact: true` 移除（ByRole name 默认全串精确匹配，语义不变）、`onScroll` 增加"滚到底高亮末节"、e2e 断言相应调整。
