---
icon: fas fa-bookmark
order: 5
title: 资源
description: 按入门、应用实践和工程查阅整理的 AI 学习资源，并关联本站已有笔记与项目复盘。
---

这里整理我学习人工智能和大模型应用时会用到的资料。先找一个具体问题，再对照文档、笔记和项目去理解，比一下收藏很多链接更容易开始。

{% include reading-path.html %}

## 一、先建立基础

适合刚开始接触深度学习或生成式 AI、需要补齐基本概念的时候。

- [动手学深度学习（中文版）](https://zh.d2l.ai/)：配合代码理解深度学习的基本概念与方法。
- [微软《生成式 AI 入门》](https://github.com/microsoft/generative-ai-for-beginners)：按课程认识生成式 AI 应用，配套代码可对照阅读。
- [Hugging Face Learn](https://huggingface.co/learn)：根据问题选择大模型、智能体等方向的课程。

## 二、围绕一个应用动手

具备基本的 Python 阅读能力后，可以从已有项目出发，把资料与实际流程对应起来。

1. **理解状态和编排**：对照 [LangGraph 官方文档](https://docs.langchain.com/oss/python/langgraph/overview)，从状态、节点、条件边与流式执行入手，再读[用问数工作流理解 LangGraph](/posts/LangGraph学习笔记-用问数工作流理解图式智能体/)。
2. **串起工程链路**：结合 [AI 智能体实战速成指南](https://didilili.github.io/ai-agents-from-zero/) 与[电商问数项目复盘](/posts/练习项目总结-电商问数智能Agent/)，看检索、SQL 和前后端怎样衔接。
3. **导入并检查应用**：对照 [Dify 官方导入说明](https://docs.dify.ai/en/cloud/use-dify/workspace/app-management)，结合[三个 Dify 应用的使用说明](/projects/dify-apps/)，核对模型、知识库与插件配置。

想先看应用思路，也可以读[生成式 AI 在家教行业的应用构想](/posts/生成式AI在家教行业的应用构想/)。这是一份课程构想，文中的效率估算仍需要实测。

## 三、遇到工程问题时查阅

- [FastAPI 中文文档](https://fastapi.tiangolo.com/zh/)：接口定义、请求参数与后端服务。
- [Qdrant 文档](https://qdrant.tech/documentation/)：向量检索与数据集合。
- [Elasticsearch 文档](https://www.elastic.co/guide/index.html)：全文检索、字段索引与查询。
- [Docker 文档](https://docs.docker.com/)：环境隔离与容器运行。
- [Git 官方文档](https://git-scm.com/doc)：版本管理与协作。

## 四、查论文与实现

- [arXiv](https://arxiv.org/)：查找论文原文，核对方法与实验设置。
- [Hugging Face Trending Papers](https://huggingface.co/papers/trending)：浏览社区整理的论文及其关联资料。
- [Hugging Face 模型与数据集](https://huggingface.co/)：寻找模型、数据集和相关项目说明。

上次核对：**2026-10-15**。原先的 Papers with Code 入口目前会跳转到 Hugging Face 论文页，这里已改为直达地址。资源的具体用法以各自的当前文档为准。
