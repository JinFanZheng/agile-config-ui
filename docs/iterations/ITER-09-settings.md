# ITER-09 设置中心与防闪屏修复

> 状态：PLANNED（2026-09-08 与用户约定，v1.0.0 后的新迭代）。小体量单卡，两个 Task。

## 1. 目标与范围

浏览器本地个性化设置（不落服务端，无新 API），及深色主题刷新白闪修复。

### Goal 定义

- G1（修复）：任一主题下刷新页面无白闪（重点 navy-console 深蓝中控）
- G2（设置页）：`/settings` 提供个性化设置，zustand persist 持久化，全站即时生效
- G3（迁移）：现有 `agile-config-ui.theme` 存储键平滑迁移，老用户无感

### 范围内设置项（首版）

| 设置       | 形态                                   | 说明                                     |
| ---------- | -------------------------------------- | ---------------------------------------- |
| 主题       | 五主题单选（迁移自 theme store）       | 顶栏切换器保留，双向同步                 |
| 界面字号   | 缩放档位（如 紧凑/标准/大）            | `html { font-size }` 或 `--font-ui` 令牌 |
| 编辑器字号 | 12/13/14/15                            | monaco Editor/DiffEditor options 联动    |
| 动效       | 开/关（默认跟随系统 prefers-reduced-motion） | 关闭时停用 anim-* 微动效            |

范围外：语言（AGENTS.md 锁定仅中文）、服务端侧用户偏好（1.13.2 无对应 API，不造轮子）。

## 2. 已诊断的 FOUC 根因（新会话直接修）

`index.html` 的 `<html>` 带**硬编码内联** `style="background-color: #ffffff"`；引导脚本只设置了
`dataset.theme`，内联白色始终优先于主题 CSS，深色主题要等应用壳渲染后才被盖住 → 白闪。

修复方向（三选一，建议 a）：

- a) 删内联 style；引导脚本按主题同步设置 `documentElement.style.backgroundColor`（五主题 → bg-base 色值小映射表，与 `src/index.css` `:root` 令牌一致，注释互指）
- b) 内联 `<style>` 写 `html{background:var(--bg-base,#fff)}`，靠 data-theme 变量切换（需确认变量定义在 `:root` 层级对 html 生效）
- c) body/#root 先行铺色（不彻底，html 仍白）

注意 dev 模式 Vite 经 JS 注入 CSS 也会加剧闪白，a 方案的同步内联色值对 dev/prod 都成立。

## 3. 任务

| Task | 内容                                                              | Verify                          |
| ---- | ----------------------------------------------------------------- | ------------------------------- |
| T-01 | FOUC 修复（index.html 引导脚本 + 内联背景映射）                    | 刷新录屏/逐帧截图（navy-console）|
| T-02 | 设置 store（zustand persist 统一键 `agile-config-ui.settings`，含 theme 迁移）+ `/settings` 页 + 全站联动（字号令牌/monaco/reduced-motion） | 单测（迁移逻辑纯函数）+ E2E 冒烟 |

## 4. Gate 要点

GR-1 baseline（当前 v1.0.0 @95eecfe）；GR-2 L0+L1；GR-6 交互规范八章对照（设置页属表单类）；令牌变更须同步 `src/index.css` 事实源注释；文案全部进 `src/strings/`。
