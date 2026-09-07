# ITER-13 主题打磨：基线对比度优化 + 浅/深分组 + 跟随系统

> 状态：验收中（EVIDENCE_READY，2026-09-08 实现与全量验证绿，等待用户验收）。
> 变更分类：中改（既有主题令牌调整 + store 类型扩展 + 切换器/设置页信息架构调整）。
> 依赖：ITER-02/09/12（主题引擎、设置中心、十主题注册表）。

## 1. 目标与范围

- G1（基线优化）：ITER-12 审计出的 16 项既有主题边际对比度全部达标——文本类（次级文/强调文/语义文本色）对 page/panel/elevated ≥4.5；对比度脚本从"新主题硬卡/旧主题基线记录"改为**十主题全量硬卡**
- G2（分组）：顶栏切换器与 /settings 主题选择按 **浅色（5）/ 深色（5）** 分组呈现；设置页保持单一 radiogroup（方向键跨组可达）
- G3（跟随系统）：新增 `system` 主题档（不改变默认 graphite）：系统深色→`navy-console`、系统浅色→`graphite`；`prefers-color-scheme` 变化实时跟随（不刷新）；boot 脚本防闪屏覆盖 system 解析路径
- 范围外：十套主题的默认值变更；system 档自定义深浅映射。

## 2. 设计要点

- `ThemeSetting = ThemeId | 'system'`；store 派生 `resolvedTheme: ThemeId`（消费方：ThemeSwitcher 高亮/monaco 深浅判定用 resolved，持久化与设置 UI 用 setting）
- 令牌调整（色相不变、只加深；色样与 handoff §7.1 同步）：
  - graphite：success #059669→#047857
  - clear-blue：accent #2F6BFF→#2456D6（hover #1C46B0）、warning #B25E09→#9A5207
  - warm-paper：text-secondary #8A7F6F→#6F6557、warning #A16207→#8F5606
  - fresh-mint：text-secondary #6B8A80→#4F6F65、accent #0D9488→#0F766E（hover #0A5A54）

## 3. 任务

| Task | 内容 | Verify |
| ---- | ---- | ------ |
| T-01 | 基线令牌优化 + 色样/handoff 同步 + 脚本全量硬卡 | check-contrast.mjs 十主题零豁免 PASS |
| T-02 | system 档（themes 哨兵与解析/store resolvedTheme+matchMedia 监听/boot 脚本/切换器与设置页分组接线） | 单测（解析/跟随）+ e2e（emulateMedia 深浅翻转 + 刷新持久 + boot 铺底） |

## 4. Gate 要点

GR-1 baseline（@444bd2d 全绿）；GR-2 L0+L1+L-Real；既有 e2e（settings/theme 断言的色值均为 bg-page，不受本次令牌调整影响）；交互规范（分组标签非交互、radiogroup 语义保持）。

## 5. 验收记录（2026-09-08）

- Baseline：@444bd2d（typecheck/lint ✓，vitest 110，e2e 34）。
- G1：16 项基线对比度全部修复（令牌只加深、色相不变，见 evidence README 明细）；check-contrast.mjs 升级为十主题零豁免硬卡并 PASS；色样与 handoff §7.1 关键色同步。
- G2：切换器 role=group 浅/深两组 + 跟随系统项（Monitor 图标）；设置页单一 radiogroup 视觉聚类（键盘语义不变）；e2e 断言组结构 5+5 与"有且仅有一项选中"。
- G3：'system' 哨兵 + resolveThemeSetting（深=navy-console/浅=graphite）+ store resolvedTheme 派生 + prefers-color-scheme 实时监听 + boot 脚本同规则铺底；默认主题不变（graphite）。
- 门禁：vitest 115（+5）；e2e 36（+2）；build ✓；对比度/色相/防混淆/三处事实源交叉一致零豁免 PASS。
- 待用户验收：重点看三处观感——加深后的晨雾蓝/薄荷主按钮与暖纸次级文字、分组菜单、跟随系统随系统深浅实时翻转。
