# ITER-18 llms.txt：AI 助手快速接入入口

> 状态：验收中（EVIDENCE_READY，2026-09-08 同源生成 + 一致性锁定 + 伺服 charset 修复 + e2e 全绿，等待用户验收）。
> 需求出处：用户提出"想让 Agent 基于文档快速把 AgileConfig 接入其他系统，加章节还是 llms.txt？"
> 决策：**不加章节**（指南内容已全、章节给人看，重复写必漂移），做 **llms.txt（索引）+ llms-full.txt（全量）**，与 /guide 同源生成。

## 1. 方案

| 件 | 说明 |
| --- | --- |
| `public/llms.txt` | llms.txt 约定的轻入口：摘要 + 文档链接 + "快速事实"（扁平键/归一化/Secret/发布语义/isPatch 全量坑，Agent 动手前必读） |
| `public/llms-full.txt` | 全量 markdown，六节结构与 /guide 一致，全部代码示例内联 |
| `src/lib/llms.ts` | 生成器：**只组合** `strings/guide.ts` 与 `snippets.ts` 既有文案/代码，不新增事实（防漂移的关键） |
| `src/lib/llms.gen.test.ts` | 写入入口：`pnpm gen:llms`（GEN_LLMS=1 驱动）；日常 `pnpm test` 自动 skip 零副作用；挂进 build 前置链 |
| `src/lib/llms.test.ts` | 一致性锁：已提交文件 == 当前指南构建产物；全量覆盖六节标题与**逐条代码示例**；禁实例地址/凭证 |

## 2. 伺服与乱码修复（用户实测反馈）

- 症状：浏览器打开 /llms.txt 中文乱码。根因：文件是合法 UTF-8，但 dev（sirv）与生产（nginx）对 text/plain **不带 charset**，浏览器按本地编码猜解。
- 修复：vite 自定义插件接管 `/llms*.txt` 显式 `text/plain; charset=utf-8`（dev + preview）；nginx.conf 增 `charset utf-8;`。e2e 断言 charset。

## 3. 验收记录（2026-09-08）

- 生成链：`pnpm gen:llms` → public 两文件（索引 1.5KB / 全量 18.6KB 六节）；`pnpm build` 前置自动再生成，dist 含两文件 ✓
- 一致性单测 4 例（同源比对/链接与快速事实/六节+全部代码示例逐条含/无实例数据凭证）；vitest **125 passed +1 skipped**
- e2e +1（llms.txt/llms-full.txt 200 + charset=utf-8 + 内容标记 + 禁 demo_app/5017）；全量 **42/42**
- 指南脚注与 README 均注明 AI 接入入口；过程插曲：tsx/vite-node 运行器方案因相对路径笔误连续误判"工具不合"，最终零新增依赖走 vitest 通道（如实记录）
