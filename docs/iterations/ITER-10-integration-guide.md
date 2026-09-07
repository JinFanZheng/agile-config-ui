# ITER-10 接入指南（产品内文档页）

> 状态：PLANNED（2026-09-08 与用户约定）。形式已与用户讨论：**网页直出（TSX 组件）**，不用 markdown 运行时。

## 1. 形式决策与理由（网页直出）

| 备选            | 结论 | 理由                                                                 |
| --------------- | ---- | -------------------------------------------------------------------- |
| .md 放 docs/    | 否   | 面向接入方开发者，应随产品交付（部署即可看），仓库 docs 面向本项目开发 |
| md 运行时渲染   | 否   | 引入 markdown→HTML 运行时与渲染面，触碰"禁 dangerouslySetInnerHTML、代码块纯文本"红线的精神；多一层安全面 |
| **网页直出 TSX** | ✅   | 代码块按纯文本渲染 + CopyButton；五主题令牌自适应；可交互（复制/锚点/语言 tab） |

素材来源（无需新调研）：`docs/AGENT_HANDOFF.md` §5 实测 API 事实 + `tools/verify-client/Program.cs`（可运行的 C# 接入参考）。

## 2. Goal 定义

- G1：`/guide` 页面上线，接入方照做即可完成：客户端接入配置中心 + 服务注册两种姿势
- G2：全部代码示例可一键复制；占位符清晰（appId/secret/env）
- G3：实测事实准确（见 §3 内容清单中的"实测坑位"）

## 3. 内容清单（首版）

1. **快速开始**：建应用 → 拿 AppId/Secret → 客户端初始化 → 改配置 → 发布 → 客户端秒级生效（WebSocket 长连接）
2. **C# SDK 接入**（AgileConfig.Client NuGet）：Options（appId/secret/nodes/env）、ConfigClient 生命周期、ConfigChanged/ReLoaded 事件（注意 ReLoaded 竞争的防御式写法，见 verify-client）
3. **服务注册**：RegisterService 三种心跳模式（client=SDK 心跳 / server=HTTP 探测 CheckUrl / none=不检查）+ DiscoveryService 发现
4. **格式与归一化实测坑位**（本项目踩过，必须写进去）：
   - JSON 按冒号逐级嵌套（`a:b:c`）；数组=数字索引键（`arr:0`）
   - 字面量归一化：`true→"True"`、`null→""`、数字→十进制文本
   - 空分组键无前导冒号；EditStatus 真实枚举 0/1/2/10
5. **FAQ**：补丁 vs 全量保存语义（全量会标记"待发布删除"）、多环境隔离、继承应用

## 4. 任务

| Task | 内容                                                                 | Verify                        |
| ---- | -------------------------------------------------------------------- | ----------------------------- |
| T-01 | `/guide` 路由 + 页面骨架（锚点导航 + 分节 + CopyButton 代码块组件）   | E2E（路由可达、复制可用）     |
| T-02 | 五节内容填充（对照 §3 清单与 handoff/verify-client 逐条核对）        | 人工验收 + 内容与实测事实一致 |

路由与登录：建议登录后可见（管理台内）；如需未登录可见，单独确认。

## 5. Gate 要点

GR-2 L0+L1；GR-6 交互规范（代码块为纯文本 + 复制反馈 toast）；文案量大但同样收敛 `src/strings/guide.ts`；不引入 markdown/html 渲染依赖。
