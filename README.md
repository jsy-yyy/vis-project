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

## 当前功能

- React + Vite + TypeScript 项目骨架。
- HCED 1886-2003 冲突事件 CSV 数据读取。
- 全局筛选器：
  - 按 conflict group 筛选。
  - 按年份范围筛选。
  - 按参战方筛选。
  - conflict group 和 participant 下拉支持本地搜索。
- Leaflet 地图：HCED 事件点叠加 CShapes 2.0 历史边界快照。
- 时间轴视图、参战方网络视图、统计面板、详情面板和 case study 快捷筛选。
- 时间轴事件选择会同步地图年份，并联动详情面板。
- 主数据加载失败时提供错误提示和重试入口。
- 筛选、统计和状态联动核心逻辑测试。

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
- `participants`
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
- `result` = `outcome`
- `type` = `event_type`
- `description` = `narrative`
- `source` = `source`

`Battle`、`BattleFilters` 和 `BattleSummary` 当前保留为兼容别名；类型层已增加 `ConflictEvent`、`ConflictEventFilters` 和 `ConflictEventSummary`，后续可以逐步替换组件与文件名。

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
