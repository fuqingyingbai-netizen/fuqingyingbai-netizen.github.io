---
layout: page
title: Dify 应用集合
description: 三个可导入自己工作区的 Dify 应用：出题组卷、知识库客服和竞品情报分析，附流程与配置前提。
permalink: /projects/dify-apps/
project_case: true
tags: [Dify, 工作流, 知识库, AI Agent]
image: /assets/img/covers/dify-apps.png
---

<p class="page-lead">同一套平台，三种应用组织方式：把固定步骤排成工作流，让知识问答走检索分支，再用 Agent 模式连接任务与工具。</p>

<figure class="case-figure"><img src="/assets/img/covers/dify-apps.png" alt="Dify 应用流程示意：出题组卷、知识库客服、竞品情报分析" width="1200" height="630"><figcaption>依据仓库应用说明整理的流程示意。</figcaption></figure>

[查看公开仓库 ↗](https://github.com/fuqingyingbai-netizen/dify-apps) · [返回项目列表](/projects/#project-dify-apps)

## 三个应用分别做什么

| 应用 | 应用类型 | 流程与输出 | 导入后需要配置 |
| --- | --- | --- | --- |
| 出题组卷 | 工作流 | 从教学文档提取内容，分别生成选择题、填空题和简答题，并写入飞书文档 | DeepSeek、飞书文档插件、目标文档授权 |
| 智能客服 | 高级对话 | 对问题分类，知识问答分支先检索知识库，再由模型组织回答 | DeepSeek、自己的知识库；按需配置排序插件 |
| 竞品情报自动分析助手 | Agent 对话 | 围绕竞品组织多轮对话，作为继续添加提示词与工具的起点 | 模型连接，以及分析任务所需的搜索等工具 |

## 可以重点看哪些流程

**出题组卷：把长任务拆成固定步骤。** 仓库说明列出 13 个节点，从文档提取、试卷命名到三类题目生成，再分步写入和读取飞书文档。适合对照理解文档输入、模板上下文和外部工具的衔接。

**智能客服：让不同问题走不同分支。** 仓库说明列出 8 个节点，包含问题分类、代码预处理、知识检索、模型回答和最终回复。知识库内容不会随 DSL 导出，需要在自己的工作区重新绑定。

**竞品分析：先搭起 Agent 的入口。** 应用采用 Agent 对话模式。模型和工具需要按目标配置；仅导入 DSL 并不等于已经获得完整的联网采集能力。

## 导入与检查

1. 在 Dify 工作区的 Studio 中选择导入 DSL 文件，使用对应目录下的 `app.yml`。
2. 对照该应用的 README 安装插件，并在工作区配置模型连接。
3. 重新绑定自己的知识库或飞书目标文档，核对工具权限。
4. 用一份可公开的测试材料检查输入、各节点输出和最终结果，再换成实际场景的数据。

模型、插件和平台环境可能产生费用，运行前应确认自己的配置与额度。这里提供的是可导入的应用配置与说明。

## 对照源码继续看

- [出题组卷说明与 DSL](https://github.com/fuqingyingbai-netizen/dify-apps/tree/main/apps/exam-paper-generator)
- [智能客服说明与 DSL](https://github.com/fuqingyingbai-netizen/dify-apps/tree/main/apps/smart-customer-service)
- [竞品分析说明与 DSL](https://github.com/fuqingyingbai-netizen/dify-apps/tree/main/apps/competitive-intel-agent)
- [Dify 官方导入与管理说明](https://docs.dify.ai/en/cloud/use-dify/workspace/app-management)

核对日期：2026-10-15。本页按公开仓库说明整理；运行截图、实际输出与效果评测需要在可公开的材料上另行补充。
