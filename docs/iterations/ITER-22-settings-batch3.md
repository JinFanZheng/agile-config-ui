# ITER-22 设置中心第三批：配置页默认视图 + 编辑器自动换行

> 状态：✅ VERIFIED（原 EVIDENCE_READY，2026-09-08 实现与全量验证绿，等待用户过目）。
> 变更分类：小改（settings store 两字段 + 设置页两行 + 消费端接线）。

## 1. 盘点结论（为什么是这两项）

| 候选 | 决定 | 理由 |
| --- | --- | --- |
| 默认环境/记住环境 | 不做 | env store 已 persist（`agile-config-ui.env`），"跟随上次"已存在 |
| **配置页默认视图** | ✅ 本批 | JSON/KV 重度用户每次进应用都要手动切换；URL `?view=` 仍最高优先 |
| **编辑器自动换行** | ✅ 本批 | 长 value/长行在 monaco 默认横向滚动，切 wordWrap 更可读 |
| 登录后落地页/分页大小/表格密度/侧栏折叠 | backlog | 价值中等或涉及面大，本批不掺 |
| KV/JSON 默认补丁模式开关 | **刻意不开放** | 补丁默认开是防误删的安全默认，可配置化会诱导全量误删（isPatch=false 会标记待发布删除） |

## 2. 规格

- `defaultConfigView: 'table' | 'kv' | 'json'`（默认 table；仅 table/kv/json，history 只能显式进入）；ConfigPage 初始视图优先级：URL `?view=` > 设置 > table
- `editorWordWrap: boolean`（默认 false 保持现状）；monaco Editor/DiffEditor `wordWrap: 'on' | 'off'`（JsonView/KvView）

## 3. 任务

| Task | 内容 | Verify |
| ---- | ---- | ------ |
| T-01 | store 两字段+校验+setters；设置页两行（SegmentedRadio/Switch） | 单测（校验/持久化） |
| T-02 | ConfigPage 初始视图接线；JsonView/KvView wordWrap | e2e（默认视图落地+还原） |

## 4. Gate 要点

GR-1 baseline @453b9f0（全绿）；文案入 strings；交互规范（分段单选/开关沿用既有组件）。

## 5. 验收记录（2026-09-08）

- store 两字段+校验回退+持久化（单测 +1：setter/持久化/非法值回退）；设置页"配置页默认视图"（表格/KV/JSON 分段单选，外观卡）与"编辑器自动换行"（开关，编辑器卡）两行。
- 消费端：ConfigPage 初始视图优先级 URL ?view= > 设置 > table；JsonView（Editor+DiffEditor）与 KvView（DiffEditor）wordWrap 接入。
- 门禁：vitest **130**；nginx 真实产物全量 e2e **44/44**（+1：默认视图落地/URL 参数优先/还原）；过程一次 publish 用例并行抖动复跑绿、一次 evaluate 闭包引用旧坑即修。
- 证据：docs/evidence/ITER-22/（设置页截图，radiogroup DOM 断言五组含新增"配置页默认视图"）。
