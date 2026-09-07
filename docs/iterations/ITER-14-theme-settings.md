# ITER-14 设置页主题区重排 + 跟随系统深浅映射可配置

> 状态：验收中（EVIDENCE_READY，2026-09-08 实现与全量验证绿，等待用户验收）。
> 变更分类：小中改（设置页信息架构 + store 两个派生字段 + boot 解析）。
> 依赖：ITER-13（system 档、分组）。

## 1. 目标

- G1（布局）：主题区改为全宽区块——"跟随系统"独立块（选中时展示深/浅映射选择）+ 浅/深两组**纵向色卡网格**（三色条+名称，5 列对齐），替换现有挤在 SettingRow 右侧的换行 chips
- G2（可配置映射）：新增 `systemDark`/`systemLight` 设置（默认 深蓝中控/石墨，各自限定深/浅组选项）；system 档下修改映射即时生效并实时持久化；boot 脚本按用户映射解析防闪屏
- G3：语义不回退——主题选择仍是单一 radiogroup（方向键跨组），映射选择是独立 combobox

## 2. 任务

| Task | 内容 | Verify |
| ---- | ---- | ------ |
| T-01 | store（systemDark/systemLight + setters + merge 校验）+ themes.resolve 参数化 + boot 脚本 | 单测 |
| T-02 | 设置页主题区重排（跟随系统块 + 色卡网格 + 映射 selects） | e2e（映射生效/持久/boot）+ 截图 |

## 3. Gate 要点

GR-1 baseline @84cf2f1（全绿）；GR-2 L0+L1+L-Real；交互规范（表单/键盘章：select 原生可达）；文案入 src/strings。

## 4. 验收记录（2026-09-08）

- Baseline：@84cf2f1（全绿）。
- G1：主题区改全宽区块——跟随系统块（选中展开映射配置）+ 浅/深色卡网格（三色条+名称，3/5 列自适应）；仍是单一 radiogroup，映射下拉为独立原生 select（键盘/无障碍免费）。
- G2：systemDark/systemLight 可配置（默认 navy-console/graphite，限定深/浅组选项）；system 档改映射即时生效，boot 按用户映射解析铺底（e2e：曜石映射刷新 `rgb(0,0,0)`）。
- 门禁：vitest 117（+2）；e2e 37（+1；一次发布链路抖动重跑通过，疑似 dev HMR 时点撞车，隔离与全量重跑均绿）；build ✓。
- 待用户验收：设置页新布局观感 + 跟随系统两个下拉。
