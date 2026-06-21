---
marp: true
theme: battlemap-zju
size: 16:9
paginate: true
html: true
title: BattleMap - 全球军事冲突事件的时空可视分析
description: 数据可视化导论课程项目答辩
---

<!-- _class: lead -->
<!-- _paginate: false -->

<p class="eyebrow">BATTLEMAP · 数据可视化导论课程项目</p>

# 全球军事冲突事件的<br>时空可视分析

<p class="subtitle">基于 HCED 冲突事件与 CShapes 2.0 历史边界，覆盖 1886–2003 年</p>

<p class="question">面对近两千条历史记录，我们怎样看出冲突在何时集中、在哪里发生，以及哪些参战方频繁共同出现？</p>

<!--
成员 A · 约 15 秒
我们的数据包含 1886 到 2003 年的近两千条军事冲突事件。项目希望回答三个问题：冲突在什么时候集中、主要发生在哪里、哪些参战方经常同时出现。
-->

---

<!-- _header: 01 · 问题与设计 -->

# 一次分析，需要在时间、地点和关系之间来回查看

<div class="columns-64 center">
<div class="screen">

![](./assets/overview.png)

</div>
<div>

### 我们把分析分成四步

<ol class="analysis-steps">
  <li><strong>先选时间</strong><br><span>从年度分布中找到峰值或感兴趣的时期</span></li>
  <li><strong>再看地图</strong><br><span>判断事件是集中在一个区域，还是分布在多个战区</span></li>
  <li><strong>比较参战方</strong><br><span>查看哪些实体频繁出现在同一事件中</span></li>
  <li><strong>回到记录</strong><br><span>检查图上的结论由哪些原始事件构成</span></li>
</ol>

</div>
</div>

<p class="takeaway">时间范围、参战方和选中事件在各视图间同步，用户不必重复设置筛选条件。</p>

<!--
成员 A · 约 25–30 秒
单独看一张图很难回答这些问题，所以我们把分析过程分成四步：先从时间轴选定时期，再到地图确认空间分布，然后看参战方关系，最后回到具体事件。各视图共享筛选状态，用户可以沿着同一个问题继续分析。
-->

---

<!-- _header: 02 · 操作演示 -->
<!-- _class: demo -->

# 以 1939–1945 年为例

<div class="video-wrap">
  <video class="video-player" controls preload="metadata" poster="./assets/demo-poster.png" src="./assets/demo.mp4"></video>
  <img class="video-poster" src="./assets/demo-poster.png" alt="World War II 案例演示封面">
  <span class="video-badge">约 70 秒</span>
</div>

<!--
成员 B · 约 65–70 秒
视频依次展示：选择二战时间窗口；定位 1944 年峰值；查看欧洲和亚太地区的事件分布；比较主要参战方关系；点击具体事件查看原始记录。
-->

---

<!-- _header: 03 · 案例结果 -->

# 二战窗口中，我们看到了什么？

<div class="metrics">
  <div class="metric"><b>450</b><span>1939–1945 年事件</span></div>
  <div class="metric"><b>124</b><span>1944 年事件，窗口内最高</span></div>
  <div class="metric"><b>74.9%</b><span>Land 类型事件占比</span></div>
</div>

<div class="columns-55 center">
<div class="screen">

![](./assets/case-study.png)

</div>
<div>

<ul class="finding-list">
  <li><strong>时间：</strong>事件数量在 1944 年达到峰值，而不是在窗口末年最高。</li>
  <li><strong>空间：</strong>欧洲和亚太均出现明显聚集，不能用单一战区概括。</li>
  <li><strong>关系：</strong>Germany–United Kingdom 与 Japan–United States 是两组高频共现关系。</li>
</ul>

<p class="note">与一战窗口相比，二战多 73 条事件（约 19.4%）。但总量只是起点，时间分布和关系结构同样重要。</p>

</div>
</div>

<!--
成员 C · 约 40 秒
二战窗口共有 450 条事件，1944 年达到 124 条峰值，陆地事件约占四分之三。地图显示欧洲和亚太都有明显聚集，关系图中也出现两组主要关系。因此，这批记录呈现的是多个战区同时增强，而不只是总量上升。
-->

---

<!-- _header: 04 · 项目贡献与技术难点 -->

# 我们主要做了两类工作

<div class="columns contribution">
<div>

### 面向分析的设计

- 单年模式显示具体事件点，多年模式显示聚合气泡，避免混淆两种时间含义
- 同时标明分析区间、地图参考年份和实际采用的历史边界快照
- 点击地图或时间轴中的事件后，详情和关系图同步更新

</div>
<div>

### 数据与工程实现

- 清洗 HCED 字段、坐标和参战方名称，并保留原始字段用于核查
- 按年份选择 CShapes 历史边界，明确它不代表战线或占领区
- 使用 React 共享状态连接各视图，并通过 URL 保存当前分析条件

</div>
</div>

<div class="project-evidence">
  <span><b>1,920</b> 条前端事件</span>
  <span><b>38</b> 次 Git 提交</span>
  <span><b>74</b> 项单元测试</span>
  <span>Playwright 端到端测试</span>
</div>

<p class="takeaway">最终目标不是替历史事件下结论，而是让分析者能够发现模式，并随时检查结论所依据的记录。</p>

<!--
成员 C · 约 25 秒
我们的工作一部分是分析设计，例如区分单年事件和多年聚合、说明历史边界的含义；另一部分是数据和工程实现，包括参战方清洗、边界快照匹配和跨视图状态同步。系统的定位是辅助探索，并让每个结论都可以回到原始记录检查。
-->

---

<!-- _header: Appendix A · 数据说明 -->
<!-- _class: appendix -->

# 两个数据集共同构成分析语境

<div class="dataset-grid">
<div class="dataset-card">

### HCED Data v3

<b>提供什么：</b>带时间、地点、参战方和结果的军事冲突事件。

<b>本项目使用：</b>1,920 条记录，覆盖 1886–2003 年。

<div class="record-example">
<b>示例事件 · Aachen1944</b>
<span>1944 · Aachen, Germany</span>
<span>United States vs Germany · Land</span>
</div>

<p class="dataset-limit">记录是 conflict event；参战方共现不直接等于联盟或敌对。</p>

</div>
<div class="dataset-card cshapes">

### CShapes 2.0

<b>提供什么：</b>不同历史时期的国家或领土边界几何。

<b>本项目使用：</b>2,930 个快照要素，与分析年份匹配显示。

<div class="record-example">
<b>示例快照 · United States of America</b>
<span>snapshot_year: 1890 · MultiPolygon</span>
<span>有效期起点 1886 · 来源 CShapes 2.0</span>
</div>

<p class="dataset-limit">边界不表示战线、占领区或实际控制范围。</p>

</div>
</div>

<p class="data-join">HCED 决定“事件何时、在哪里发生”，CShapes 提供对应年份的历史边界背景；两者按时间与空间共同参与地图分析。</p>

> 数据来源、许可与清洗步骤详见项目 README。

---

<!-- _header: Appendix B · 视图选择 -->
<!-- _class: appendix -->

# 各视图分别回答什么问题？

<div class="view-grid">
<figure>
  <img src="./assets/view-timeline.png" alt="时间概览">
  <figcaption><b>什么时候集中？</b><span>年度柱形与区间选择定位峰值和分析窗口。</span></figcaption>
</figure>
<figure>
  <img src="./assets/view-map.png" alt="地图视图">
  <figcaption><b>事件在哪里聚集？</b><span>位置表示经纬度，多年气泡表示事件聚集数量。</span></figcaption>
</figure>
<figure>
  <img src="./assets/view-network.png" alt="参战方关系网络">
  <figcaption><b>谁与谁经常共现？</b><span>节点大小表示事件数，边宽表示共现次数。</span></figcaption>
</figure>
<figure>
  <img src="./assets/view-details.png" alt="统计概览与事件详情">
  <figcaption><b>结论由哪些记录构成？</b><span>统计概览保留整体结构，事件详情提供具体核查入口。</span></figcaption>
</figure>
</div>

---

<!-- _header: Appendix C · 状态管理 -->
<!-- _class: appendix -->

# 各视图如何保持一致？

<div class="state-flow">
  <div><b>用户操作</b><br>选择年份、参战方或事件</div>
  <div><b>共享状态</b><br>保存当前分析条件</div>
  <div><b>派生计算</b><br>筛选、聚合并生成图表数据</div>
  <div><b>视图更新</b><br>时间、地图、关系和详情同步变化</div>
</div>

<div class="state-detail-grid">
<div class="state-panel">

### 用户看到的分析条件

- 单年度或多年度分析
- 当前年份与年份范围
- 聚焦的参战方
- 当前选中或锁定的事件

<p class="state-vars"><code>analysisMode</code> · <code>selectedYearRange</code> · <code>currentYear</code> · <code>selectedParticipant</code> · <code>selectedBattleId</code></p>

</div>
<div class="state-panel">

### 为了保持可复现

- 当前分析条件写入 URL
- 分享链接可以恢复年份和参战方
- 锁定事件后，筛选变化不会立即清空详情
- 关系图的局部筛选不改变其他视图

</div>
</div>

---

<!-- _header: Appendix D · 分工与复现 -->
<!-- _class: appendix -->

# 成员分工、运行方式与 AI 使用

<div class="member-grid">
<div class="member-card">

### 成员 A

- HCED 下载、清洗与字段映射
- CShapes 快照生成与年份匹配
- Map View、历史边界呈现与地图交互

</div>
<div class="member-card">

### 成员 B

- Timeline 与案例分析
- 关系网络及关系数据处理
- 时间、地图与网络间的联动优化

</div>
<div class="member-card">

### 成员 C

- React/Vite 项目架构
- 页面布局、全局状态与系统集成
- 展开详情页、统计概览与事件详情
- UI 统一、README 与提交文档

</div>
</div>

<div class="team-work"><b>共同完成：</b>跨模块联调、自动化测试、案例复核与最终答辩验收。</div>

<div class="reproduce-row">
<code>npm install</code>
<code>npm run build:hced</code>
<code>npm run build:cshapes</code>
<code>npm test</code>
<code>npm run build</code>
<code>npm run test:e2e</code>
</div>

<p class="small"><strong>AI 使用：</strong>使用 OpenAI Codex 辅助代码审查、调试、测试补充和文档整理。数据选择、分析问题、视图与交互设计以及最终验收由团队成员完成。</p>
