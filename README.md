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
- Leaflet 地图：HCED 事件点叠加 CShapes 2.0 历史边界快照。
- 时间轴视图、参战方网络视图、统计面板、详情面板和 case study 快捷筛选。
- 筛选与统计核心逻辑测试。

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
