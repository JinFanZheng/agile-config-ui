# 第二轮子代理验收报告（2026-09-08，ITER-22..29 收敛 VERIFIED 依据）

用户确认后单代理验收（真实栈 5173 + 代码 + CI 三面），全程只读、临时资源零残留。

## 结论：功能与交付 6/6 全 PASS

- **ITER-22**：设置两行实测（默认视图 JSON 直落 monaco、URL 参数优先、自动换行持久），用后还原
- **ITER-24**：侧栏折叠 56px/sr-only 可访问名/刷新持久；落地页偏好→/apps、from 回跳优先（实发请求 pageSize=50 抓包）；指南与 /apps 同宽；guards 单一导航源核对
- **ITER-25**：sso.ts/main.tsx 兑换引导/ssoButtonText 接线核对；handoff §7.0 三要点齐全；导航链 transcript 与落地截图在案（遵嘱未重跑 sso-test.sh，近期两轮 PASS + CI 覆盖）
- **ITER-26**：三份文档内容与现状一致（含 22/24 新增项），全部相对链接**零断链**
- **ITER-27+28**：install.sh sqlite 全生命周期实测（健康/登录/charset/upgrade/**容器卷网络目录端口五重零残留**）；错误密码 fail-fast 人话报错；模板语义与 uninstall 文案分叉核对；外部 MySQL 完整矩阵以 CI 绿为准
- **ITER-29**：Install Matrix run 34213153957 三 job 全绿（headSha 与本地一致），产物形态断言与三重零残留步骤在案

## 两处文档偏差及处置

- **A（真问题，已修）**：INDEX.md 中 ITER-27/28/29 在 WIP 与路线图两表各重复一行（回填脚本行扫描在重复行上级联）→ 已去重，22..29 各恰好两行
- **B（验收提示词预期错误，非文档问题）**：验收提示误写"22 及之后不在 v1.1.0"——实际 v1.1.0 在 ITER-25 完成后才打 tag，含 09..25 共 17 张自洽正确；26..29 进 v1.2.0 属既定计划。CHANGELOG 无需改动

## 备注（非缺陷）

外部库预检对"DNS 解析失败"类错误走通用兜底分支（OrbStack 下表现为 ERROR 2013），报错仍可读；人话分支覆盖 2003/10061/Can't connect/Connection refused。
