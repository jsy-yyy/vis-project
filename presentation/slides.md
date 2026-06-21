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

<p class="subtitle">基于 1886–2003 年 HCED 冲突事件与 CShapes 2.0 历史边界</p>

<p class="question">怎样从时间、空间和参战关系中发现模式，并回溯到原始证据？</p>

<!--
成员 A · 约 15 秒
我们关注的不是某一场战争的故事，而是如何从 1886 到 2003 年的全球冲突事件中定位模式，并进一步核查这些结论来自哪些原始记录。
-->

---

<!-- _header: 01 · 设计动机与分析路径 -->

# 四个视图，共享同一个分析状态

<div class="columns-64 center">
<div class="screen">

![](./assets/overview.png)

</div>
<div>

<ul class="point-list">
  <li><strong>时间窗口</strong>定位长期趋势与异常峰值</li>
  <li><strong>历史地图</strong>核验事件的空间聚集</li>
  <li><strong>关系网络</strong>解释参战方共现结构</li>
  <li><strong>事件详情</strong>回到 HCED 原始证据</li>
</ul>

<div class="chips">
  <span class="chip">共享年份</span>
  <span class="chip">共享参战方</span>
  <span class="chip">共享事件选择</span>
</div>

</div>
</div>

<div class="flow">
  <div class="flow-step">时间定位</div>
  <div class="flow-step">空间核验</div>
  <div class="flow-step">关系解释</div>
  <div class="flow-step">事件回溯</div>
</div>

<!--
成员 A · 约 25–30 秒
系统并不是把四张图放在一起。时间窗口、地图、网络和详情共享同一组状态，因此一次 brushing 会沿着时间定位、空间核验、关系解释和事件回溯这条路径传递。
-->

---

<!-- _header: 02 · 60 秒交互演示 -->
<!-- _class: demo -->

# 从 World War II 窗口到原始事件

<div class="video-wrap">
  <video class="video-player" controls preload="metadata" poster="./assets/demo-poster.png" src="./assets/demo-short.mp4"></video>
  <img class="video-poster" src="./assets/demo-poster.png" alt="World War II 案例演示封面">
  <span class="video-badge">1939–1945 · 约 60 秒</span>
</div>

<p class="small">若视频无法播放：打开同目录 <code>demo-short.mp4</code>；在线系统入口：<a href="../app/?mode=multi&year=1944&start=1939&end=1945#timeline-overview">World War II 案例</a></p>

<!--
成员 B · 约 55–60 秒
播放视频，仅补充必要旁白：应用二战窗口；定位 1944 年峰值；在地图核验空间簇；在网络中聚焦主要关系；最后点击事件回溯原始记录。
-->

---

<!-- _header: 03 · 案例洞察与原创设计 -->

# 一个案例，不止一个总量

<div class="metrics">
  <div class="metric"><b>450</b><span>二战窗口事件数</span></div>
  <div class="metric"><b>124</b><span>1944 年峰值事件数</span></div>
  <div class="metric"><b>74.9%</b><span>Land 类型占比</span></div>
</div>

<div class="columns-55 center">
<div class="screen">

![](./assets/case-study.png)

</div>
<div>

<ul class="point-list">
  <li><strong>不同时间语义：</strong>单年事件点与多年密度气泡分开编码</li>
  <li><strong>明确历史语境：</strong>区分分析范围、参考年份与 CShapes 快照</li>
  <li><strong>连续证据链：</strong>brushing、地图下钻、网络聚焦与详情回溯联动</li>
</ul>

<p class="small">二战窗口比一战窗口多 73 条事件，约 <strong>19.4%</strong>；规模差异还需结合峰值、空间与关系结构解释。</p>

</div>
</div>

<!--
成员 C · 约 40 秒
二战窗口共 450 条事件，1944 年达到 124 条峰值，Land 类型约占四分之三。我们的贡献不是只给出这些数字，而是建立统一验证路径，并明确区分单年、多年和历史边界快照的语义。
-->

---

<!-- _header: 04 · 技术难点与工程保障 -->

# 让复杂数据能够被稳定解释

<div class="columns-3">
<div>

### 数据

- HCED 字段清洗与坐标过滤
- 参战方别名和历史实体规范化
- CShapes 快照与年份匹配

</div>
<div>

### 交互

- React 派生状态驱动多视图
- URL 恢复分析窗口与选择
- 地图、网络和详情双向联动

</div>
<div>

### 工程

- **1,920** 条前端事件
- **38** 次 Git 提交
- 单元测试与 Playwright E2E

</div>
</div>

<div class="architecture">
  <div>HCED + CShapes</div>
  <div>清洗与快照脚本</div>
  <div>共享分析状态</div>
  <div>时间 · 地图 · 关系 · 详情</div>
</div>

<p class="question">BattleMap 不只回答“发生了多少”，还回答“何时、何地、谁参与，以及结论来自哪些记录”。</p>

<!--
成员 C · 约 25 秒
主要工程难点是历史实体清洗、边界快照匹配和跨视图状态同步。项目保留完整 Git 记录，并通过单元与端到端测试保证复现。最后，BattleMap 的价值是把聚合结论重新连接到可核查的事件证据。
-->

---

<!-- _header: Appendix A · 数据与局限 -->
<!-- _class: appendix -->

# 数据来源、规模与解释边界

| 项目 | 内容 |
| --- | --- |
| 主数据 | Historical Conflict Event Dataset (HCED Data v3) |
| 时间范围 | 1886–2003 |
| 前端记录 | 1,920 条有有效年份和经纬度的冲突事件 |
| 历史边界 | CShapes 2.0 国家／领土边界快照 |
| 数据处理 | Node.js 脚本完成下载、过滤、字段映射和实体规范化 |

- HCED 的记录是 **conflict event**，不保证每条都是狭义 battle。
- 参战方“共现”仅表示出现在同一事件记录中，不等同于联盟或敌对关系。
- CShapes 表示历史国家／领土边界，不表示战线、占领区或实际控制线。

> 数据来源与许可详见项目 README 和系统文档。

---

<!-- _header: Appendix B · 视觉编码 -->
<!-- _class: appendix -->

# 为什么选择这些视图？

| 分析问题 | 视觉表达 | 选择理由 |
| --- | --- | --- |
| 何时集中？ | 年度柱形、区间 brushing、峰值指标 | 比较长期趋势、局部窗口和异常峰值 |
| 在哪里？ | 历史边界、单年事件点、多年密度气泡 | 同时保留位置、聚集程度和历史语境 |
| 谁与谁关联？ | 参战方共现网络、年度热力图 | 揭示核心实体、强关系及其时间变化 |
| 结论依据？ | 地图下钻、事件详情、原始字段 | 避免分析停留在不可核查的聚合图形 |

<div class="chips">
  <span class="chip">位置 → 经纬度</span>
  <span class="chip">气泡大小 → 聚集数量</span>
  <span class="chip">节点大小 → 事件数</span>
  <span class="chip">边宽 → 共现次数</span>
  <span class="chip">琥珀色 → 当前选择</span>
</div>

---

<!-- _header: Appendix C · 状态与架构 -->
<!-- _class: appendix -->

# 多视图联动如何实现？

<div class="architecture">
  <div>年份窗口<br>当前年份</div>
  <div>参战方<br>选中事件</div>
  <div>Memoized<br>派生数据</div>
  <div>地图／时间／网络／详情</div>
</div>

<div class="columns-55">
<div>

### 单一共享状态

- `analysisMode`
- `selectedYearRange`
- `currentYear`
- `selectedParticipant`
- `selectedBattleId`

</div>
<div>

### 可复现分析

- 状态同步到 URL 查询参数
- 分享链接可恢复案例窗口
- 锁定事件可跨筛选保留详情
- 局部网络筛选不会污染全局状态

</div>
</div>

---

<!-- _header: Appendix D · 复现、分工与 AI 声明 -->
<!-- _class: appendix -->

# 工程证据与责任边界

<div class="columns-3">
<div>

### 成员 A

- HCED 清洗与字段映射
- CShapes 快照生成
- 历史实体与地图语义

</div>
<div>

### 成员 B

- 时间分析与案例洞察
- 关系网络与视图联动
- 交互测试与优化

</div>
<div>

### 成员 C

- React/Vite 架构
- 状态管理与系统集成
- 详情、统计与文档

</div>
</div>

```bash
npm install
npm run build:hced
npm run build:cshapes
npm test
npm run build
npm run test:e2e
```

<p class="small"><strong>AI 使用声明：</strong>OpenAI Codex 用于代码审查、调试、视觉检查、测试补充、文档整理和局部实现建议；数据选择、分析任务、视图设计、交互取舍及最终验收由团队完成。</p>
