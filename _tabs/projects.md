---
icon: fas fa-laptop-code
order: 2
title: 项目
description: 从 AI 简历评估、Dify 应用到电商问数，查看个人项目与开源学习实践的用途、实现说明和公开代码。
---

<!-- 本文件由 tools/sync_projects.py 自动生成，请勿直接修改。 -->
<!-- 如需增删项目或调整介绍，请编辑 _data/projects.json 后重新运行脚本。 -->

从个人工具到 AI 应用，这里记录我做过的项目和学习实践。每个项目都附有仓库入口，方便查看代码。

{% include project-filters.html %}

<section data-project-section="personal" markdown="1">

## 个人项目

<div class="project-grid" markdown="1">

<article class="project-card" id="project-resume-evaluator-agent" data-project-group="personal" data-project-tags="[&quot;Python&quot;, &quot;LangChain&quot;, &quot;Coze&quot;]" markdown="1">

### 🤖 [resume-evaluator-agent](https://github.com/fuqingyingbai-netizen/resume-evaluator-agent)

<figure class="project-preview"><img src="/assets/img/covers/resume-evaluator-agent.png" alt="简历输入、对话 Agent、Coze 工作流与评估报告的流程示意" width="1200" height="630" loading="lazy" decoding="async"></figure>

AI 简历评估助手：基于大语言模型对简历进行智能评估与分析，帮助快速了解简历的匹配程度。

`Python` `LangChain` `Coze`

<div class="project-stats"><span>最近更新：2026-05-30</span></div>

<a class="project-reading" href="/projects/resume-evaluator-agent/">查看项目说明 →</a>

</article>

<article class="project-card" id="project-journal-todo" data-project-group="personal" data-project-tags="[&quot;TypeScript&quot;, &quot;前端应用&quot;]" markdown="1">

### 📔 [journal-todo](https://github.com/fuqingyingbai-netizen/journal-todo)

日记与待办管理应用，把每天的记录和任务安排放在一起管理。

`TypeScript` `前端应用`

<div class="project-stats"><span>最近更新：2026-05-26</span></div>

</article>

<article class="project-card" id="project-pomodoro-timer" data-project-group="personal" data-project-tags="[&quot;Python&quot;, &quot;工具类应用&quot;]" markdown="1">

### 🍅 [pomodoro-timer](https://github.com/fuqingyingbai-netizen/pomodoro-timer)

番茄钟计时工具，帮助保持专注、管理学习节奏。

`Python` `工具类应用`

<div class="project-stats"><span>最近更新：2026-05-25</span></div>

</article>

<article class="project-card" id="project-fuqingyingbai-netizen.github.io" data-project-group="personal" data-project-tags="[&quot;Jekyll&quot;, &quot;GitHub Actions&quot;, &quot;自动化&quot;]" markdown="1">

### 🌐 [个人网站（本仓库）](https://github.com/fuqingyingbai-netizen/fuqingyingbai-netizen.github.io)

用 Chirpy 主题搭建的个人网站，由 GitHub Actions 自动构建部署，项目页由脚本自动同步。

`Jekyll` `GitHub Actions` `自动化`

</article>

<article class="project-card" id="project-dify-apps" data-project-group="personal" data-project-tags="[&quot;Dify&quot;, &quot;AI Agent&quot;, &quot;LLM 应用&quot;]" markdown="1">

### 🧩 [dify-apps（Dify 应用集合）](https://github.com/fuqingyingbai-netizen/dify-apps)

<figure class="project-preview"><img src="/assets/img/covers/dify-apps.png" alt="Dify 出题组卷、知识库客服与竞品情报分析的流程示意" width="1200" height="630" loading="lazy" decoding="async"></figure>

在 Dify 平台搭建的 AI 应用集合，以 DSL 文件形式开源：出题组卷工作流、知识库智能客服、竞品情报分析 Agent，可直接导入 Dify 使用或二次开发。

`Dify` `AI Agent` `LLM 应用`

<div class="project-stats"><span>最近更新：2026-09-28</span></div>

<a class="project-reading" href="/projects/dify-apps/">查看项目说明 →</a>

</article>

</div>

</section>

<section data-project-section="learning" markdown="1">

## 学习与实践项目

<div class="project-grid" markdown="1">

<article class="project-card" id="project-shopkeeper-agent" data-project-group="learning" data-project-tags="[&quot;Python&quot;, &quot;LangGraph&quot;, &quot;FastAPI&quot;, &quot;Qdrant&quot;, &quot;Elasticsearch&quot;, &quot;React&quot;]" markdown="1">

### 🛒 [shopkeeper-agent（电商问数）](https://github.com/fuqingyingbai-netizen/shopkeeper-agent)

<figure class="project-preview"><img src="/assets/img/covers/shopkeeper-agent.png" alt="混合检索、SQL 生成校验、查询与流式返回的流程示意" width="1200" height="630" loading="lazy" decoding="async"></figure>

基于 LangGraph 的智能数据分析 Agent 实战项目：自然语言提问 → 混合检索 → SQL 生成与执行 → 流式返回分析结果。通过这个项目系统练习了智能体工作流编排与前后端联调。

`Python` `LangGraph` `FastAPI` `Qdrant` `Elasticsearch` `React`

<div class="project-stats"><span>最近更新：2026-08-29</span></div>

> Fork 自 didilili 的开源教程项目，用于学习实践，详细复盘见[项目总结随笔](/posts/练习项目总结-电商问数智能Agent/)。

<a class="project-reading" href="/posts/练习项目总结-电商问数智能Agent/">阅读项目复盘 →</a>

</article>

<article class="project-card" id="project-generative-ai-for-beginners" data-project-group="learning" data-project-tags="[&quot;学习资料&quot;, &quot;Fork&quot;]" markdown="1">

### 📚 [generative-ai-for-beginners](https://github.com/fuqingyingbai-netizen/generative-ai-for-beginners)

微软《生成式 AI 入门》21 课学习项目，系统建立生成式 AI 的知识框架。

`学习资料` `Fork`

<div class="project-stats"><span>最近更新：2026-08-06</span></div>

</article>

</div>

</section>

---

本页信息由 [sync_projects.py](https://github.com/fuqingyingbai-netizen/fuqingyingbai-netizen.github.io/blob/main/tools/sync_projects.py) 自动同步，欢迎到[我的 GitHub](https://github.com/fuqingyingbai-netizen) 看看，也欢迎一起交流。
