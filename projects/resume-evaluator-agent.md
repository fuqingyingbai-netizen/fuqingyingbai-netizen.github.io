---
layout: page
title: AI 简历评估助手
description: 从公开代码理解一个对话式简历评估助手：LangChain Agent 调用 Coze 工作流，并返回评估报告。
permalink: /projects/resume-evaluator-agent/
project_case: true
tags: [Python, LangChain, LangGraph, Coze]
image: /assets/img/covers/resume-evaluator-agent.png
---

<p class="page-lead">把简历评估接到对话里：接收简历文件地址，通过工具调用 Coze 工作流，再把评估结果返回给用户。</p>

<figure class="case-figure"><img src="/assets/img/covers/resume-evaluator-agent.png" alt="流程示意：简历输入经过对话 Agent 和 Coze 工作流，返回评估报告" width="1200" height="630"><figcaption>依据公开代码整理的流程示意。</figcaption></figure>

[查看公开仓库 ↗](https://github.com/fuqingyingbai-netizen/resume-evaluator-agent) · [返回项目列表](/projects/#project-resume-evaluator-agent)

## 它怎样工作

公开代码包含两层：一层是负责对话和工具选择的 Agent，另一层是执行平台工作流的工具封装。

1. 用户提供简历文件地址。工具说明中约定支持 PDF / Word；未提供文件地址时，需要在后续对话中补充简历文本。
2. Agent 可调用简历评估工具，也可先查询工作流信息。
3. 评估工具调用 Coze 平台上的工作流，返回评估报告数据；调用失败或超时时会返回错误说明。

## 公开实现里能看到什么

<p class="table-hint">表格可左右滑动，查看完整实现说明。</p>

| 部分 | 当前实现 |
| --- | --- |
| 对话入口 | 使用 LangChain `create_agent` 组装模型、提示词和工具 |
| 模型调用 | `ChatOpenAI` 从环境与配置文件读取连接设置，启用流式输出 |
| 对话状态 | 自定义消息窗口保留最近 40 条消息，并接入 checkpointer |
| 工作流工具 | 封装“执行简历评估”和“查询工作流信息”两个工具 |
| 异常处理 | 工作流执行设置 120 秒超时，并处理执行失败与超时情况 |

## 怎样对照代码阅读

- [Agent 组装入口](https://github.com/fuqingyingbai-netizen/resume-evaluator-agent/blob/main/src/agents/agent.py)：看模型、工具与消息状态怎样连接。
- [工作流工具封装](https://github.com/fuqingyingbai-netizen/resume-evaluator-agent/blob/main/src/tools/coze_workflow_tool.py)：看文件输入、平台调用和结果返回。
- [依赖配置](https://github.com/fuqingyingbai-netizen/resume-evaluator-agent/blob/main/pyproject.toml)：项目声明 Python 3.12 及以上，并依赖 Coze 相关运行组件。

## 运行前需要准备什么

仓库 README 给出了下面的 Bash 启动入口：

```bash
# 运行流程
bash scripts/local_run.sh -m flow

# 启动 HTTP 服务
bash scripts/http_run.sh -m http -p 5000
```

运行还需要对应的模型配置、环境变量以及 Coze 工作流执行工具。公开工具封装引用了平台运行路径，因此克隆代码后，还需要检查自己的运行环境与工作流绑定是否齐全。

## 当前范围

这页介绍的是公开代码中的对话入口与工作流调用方式。评估工作流的完整平台编排、实际输出样例和效果评测尚未在本页展示，不能据此判断评估准确性。

核对日期：2026-10-15。后续有可公开的运行示例时，再补充展示与验证过程。
