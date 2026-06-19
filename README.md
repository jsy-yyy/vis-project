# BattleMap

全球军事冲突事件时空可视分析系统。

本项目是课程可视化项目的前端 Demo。当前主数据已从早期 mock battle 数据切换为 HCED（Historical Conflict Event Dataset）军事冲突事件点，历史边界辅助层使用 CShapes 2.0。第一版固定分析范围为 1886-2003，使 HCED 事件点与 CShapes 历史国家/领土边界能在时间上完整叠加。

## 项目目标

系统面向全球军事冲突事件的时空可视分析，重点回答：

- 冲突事件在不同年份和地区如何分布。
- 高频冲突区随时间如何变化。
- 参战方之间的共现关系如何变化。
- 事件类型、冲突组和历史边界背景之间有什么空间关系。

注意：HCED 记录的是 military conflict event，不承诺每条记录都是严格意义上的 battle。CShapes 2.0 表示国家/领土边界，不表示战线、占领区或实际控制线。

## 为什么使用可视化分析

BattleMap 关注的不是单一总量预测，而是三个互相依赖的分析问题：

- 冲突事件在什么时期集中，峰值前后如何变化？
- 同一时期的事件在全球哪些区域聚集，并与当时的历史边界形成什么空间关系？
- 哪些参战方频繁共同出现，这些关系在不同时间窗口中如何重组？

纯统计表可以给出总数和排名，但难以同时表达时间峰值、空间迁移、历史边界和关系网络。机器学习也可以聚类或预测，却不能替代分析者对具体年份、地点、参战方和原始事件的可解释追踪。因此系统采用“时间概览 → 地图定位 → 关系比较 → 详情核查”的多视图分析路径。

### 视觉通道与交互语义

- 时间概览以柱高编码年度事件数，内层柱编码当前参战方结果，描边编码地图年份。
- 地图以位置编码事件地点，以气泡大小和亮度编码长期事件集中程度，并叠加对应年代的 CShapes 边界。
- 关系网络以节点大小编码事件数，以边宽编码共同事件数，以颜色和国旗辅助识别参战方及阵营语义。
- 时间 brushing 会更新所有视图；地图或时间轴选择事件会更新详情并高亮网络参战方；网络和统计面板选择参战方会反向过滤时间、地图与统计。
- 年度摘要和事件列表默认折叠，遵循 overview first、zoom and filter、details on demand。

## 当前功能

- React + Vite + TypeScript 项目骨架。
- HCED 1886-2003 冲突事件 CSV 数据读取。
- 地图上方的紧凑时间概览支持年份窗口 brushing、当前年份选择和时间播放。
- 关系视图提供可搜索参战方 combobox，网络节点、矩阵和统计榜单共享同一选择状态。
- 当前年份窗口、参战方和锁定事件以状态标签展示，可分别清除或整体重置。
- 吸顶视图导航：地图、时间、关系、分析。
- Leaflet 地图：HCED 事件点叠加 CShapes 2.0 历史边界快照。
- 全局事件分布使用 8° 网格密度气泡，气泡大小和亮度共同表示事件集中程度。
- 时间轴视图、参战方网络视图、参战方-冲突组矩阵、统计面板、详情面板和 case study 快捷筛选。
- 关系网络和事件矩阵通过模式切换呈现，避免同时堆叠高密度图表。
- 数据加载失败时提供错误提示和重试入口。
- 筛选、统计和状态联动核心逻辑测试。
- Playwright 端到端测试覆盖时间、地图、关系和 URL 状态恢复。

## 数据规模与系统复现

- HCED 前端数据：1,920 条冲突事件，覆盖 1886–2003 年。
- 规范化参战方：80 个国家、历史政权或可进入网络的联盟实体。
- 前端 CSV 约 2.31 MB；CShapes 历史边界快照约 11.57 MB。
- 数据清洗由 Node 脚本完成，前端负责加载、筛选、聚合和交互呈现，不依赖后端服务。
- 地图只渲染当前年份事件；网络限制可见节点和边数量；时间与统计聚合使用 memoized 派生状态。

完整复现：

```bash
npm install
npm run build:hced
npm run build:cshapes
npm test
npm run build
npm run test:e2e
```

首次执行端到端测试前需要安装 Chromium：

```bash
npx playwright install chromium
```

## 案例与洞察

### 二战主案例：1939–1945

- 窗口内共有 450 条事件，1944 年达到 124 条峰值。
- Germany–United Kingdom 在 107 条事件中共同出现。
- Japan–United States 在 101 条事件中共同出现。
- Land 类型事件 337 条。

时间峰值、地图上的欧洲与亚太空间簇，以及关系网络中的两组强关系共同表明：二战数据不是一个单中心过程，而是两个主要战区并行增强。系统允许继续定位到具体事件，核查这种模式来自哪些记录。

### 一战对照：1914–1918

- 窗口内共有 377 条事件，1915 年达到 85 条峰值。
- Germany 和 United Kingdom 分别出现在 218、179 条事件中。
- 地图可用于比较法国—比利时集中区与奥斯曼相关区域，网络则展示主要参战方的共现结构。

解释限制：共现只表示参战方出现在同一事件记录中，不必然等于联盟；事件数量也不等于战争强度、伤亡或领土控制范围。

## 迭代记录

- [2026-06-18 整体体验迭代](doc/ITERATION_2026-06-18.md)：视图导航、移动端折叠筛选、网络/矩阵切换、地图密度气泡、颜色语义和布局优化。

## 快速开始

安装依赖：

```bash
npm install
```

启动开发服务器：

```bash
npm run dev
```

默认访问：

```text
http://127.0.0.1:5173/
```

运行测试：

```bash
npm test
```

生产构建：

```bash
npm run build
```

## 数据生成

生成 HCED 前端事件 CSV：

```bash
npm run build:hced
```

脚本会优先读取 `/private/tmp/hced-data-v3.csv`。如果不存在，则从 Harvard Dataverse 下载 HCED Data v3：

```text
https://dataverse.harvard.edu/api/access/datafile/13390255
```

输出文件：

```text
public/data/hced/conflict_events.csv
```

生成 CShapes 1886-2003 历史边界快照：

```bash
npm run build:cshapes
```

脚本会优先读取 `/private/tmp/cshapes-2.0.geojson`。如果不存在，则从 CShapes 官方地址下载：

```text
https://icr.ethz.ch/data/cshapes/CShapes-2.0.geojson
```

输出文件：

```text
public/data/cshapes/cshapes_1886_2003_snapshots.geojson
```

CShapes 第一版按十年生成 `1890, 1900, ..., 2000`，并额外加入 `1914, 1918, 1939, 1945, 1991, 2003`。

## 数据接口

`public/data/hced/conflict_events.csv` 字段：

- `event_id`
- `event_name`
- `war_name`
- `year`
- `location_name`
- `latitude`
- `longitude`
- `participants`（由高/中置信且允许进入网络的 country actors 生成，用于筛选、统计和网络图）
- `raw_participants`（HCED 原始 `Participants` 规范化后的关键词，用于溯源）
- `actors`（综合 `Participants`、`Winner`、`Loser`、`Participant 1/2` 清洗出的 actor JSON）
- `winner`
- `loser`
- `participant_1`
- `participant_2`
- `country`
- `outcome`
- `event_type`
- `narrative`
- `source`

`useBattleData()` 仍保留原有返回结构，方便现有组件继续复用：

```ts
useBattleData(): {
  battles: Battle[];
  wars: War[];
  participants: Participant[];
  loading: boolean;
  error: Error | null;
  retry: () => void;
};
```

其中 `battles` 实际由 HCED conflict events 映射而来：

- `id` = `event_id`
- `name` = `event_name`
- `warId` = `war_name` slug
- `year` = `year`
- `latitude` / `longitude` = HCED coordinates
- `locationName` = `location_name`
- `participants` = `participants` parsed to IDs
- `actors` = `actors` parsed to actor objects
- `rawParticipantNames` = `raw_participants` parsed to names
- `winnerNames` = `winner` parsed to names
- `loserNames` = `loser` parsed to names
- `result` = `outcome`
- `type` = `event_type`
- `description` = `narrative`
- `source` = `source`

`Battle`、`BattleFilters` 和 `BattleSummary` 当前保留为兼容别名；类型层已增加 `ConflictEvent`、`ConflictEventFilters` 和 `ConflictEventSummary`，analytics 层也提供 conflict event 命名的导出，后续可逐步替换组件与文件名。

Actor 清洗由两张人工表驱动：

- `scripts/participant-normalization.csv`：主要清洗原始 `Participants` 中可确认的国家/历史实体。
- `scripts/actor-normalization.csv`：补充 winner/loser、派系、叛军、ignore 和 ambiguous 规则。

每次运行 `npm run build:hced` 会额外生成：

- `public/data/hced/actor_audit.csv`：仍未映射或需要复核的 actor token、出现次数和示例事件。

地图边界着色规则：

- 国家间胜败只使用可解析为国家/帝国/联盟的 winner/loser actors。
- 内战、叛军、派系 actor 不染成 winner/loser，而是投影到 `map_target` 或事件 `country`，用 internal conflict 样式高亮。
- `country` 只作为地点上下文和内战投影 fallback，不直接进入网络图。

早期 `src/data/mockData.ts` 仅保留为开发参考，前端默认不再使用。

## 分工边界

成员 A 重点负责：

- HCED 原始数据下载、清洗和字段映射。
- CShapes 2.0 历史边界数据处理与快照生成。
- 维护 `scripts/build-hced-conflict-events.mjs` 和 `scripts/build-cshapes-snapshots.mjs`。
- 检查事件坐标、年份范围、重复记录和缺失值。
- 改善参战方清洗，合并别名、复数形式和明显噪声词。
- 完善地图中的事件点、历史边界和国家高亮表达。

成员 B 重点负责：

- `TimelineView` 的正式实现与交互优化。
- `NetworkView` 的正式关系网络实现。
- 时间轴、网络图和地图之间的联动细节。
- 构建 conflict event、conflict group 和 participant 之间的关系。
- 完善不同筛选条件下的空状态和交互检查。

成员 C 重点负责：

- React/Vite 项目框架。
- 页面整体布局、全局筛选器和状态管理。
- `StatisticsPanel`、`DetailPanel`、`CaseStudyPanel`。
- 组件集成、UI 统一和 README 维护

## 目录结构

```text
.
├── public/data
│   ├── cshapes
│   └── hced
├── scripts
│   ├── build-cshapes-snapshots.mjs
│   └── build-hced-conflict-events.mjs
├── src
│   ├── App.tsx
│   ├── components
│   ├── data/mockData.ts
│   ├── hooks/useBattleData.ts
│   ├── lib
│   └── types/domain.ts
├── package.json
└── vite.config.ts
```

## 技术栈

- React
- Vite
- TypeScript
- Leaflet
- Vitest
- lucide-react

## 数据说明

HCED 数据来源为 Charles Miller 的 Historical Conflict Event Dataset。当前脚本使用 Dataverse 上的 `HCED Data v3.csv`，过滤 `1886 <= year <= 2003` 且保留有经纬度的事件。

CShapes 2.0 仅作为历史国家/领土边界背景层。它不表示前线、占领区或战场控制范围，地图中的事件点与边界叠加只用于时空背景分析。
