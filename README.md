# BattleMap

世界战争与战役时空演化可视分析系统。

本项目是课程可视化项目的前端 Demo 壳子，当前版本使用 mock 数据先跑通系统结构、全局筛选、统计面板、详情面板、case study，以及地图、时间轴、网络图之间的组件接口。后续 A/B 成员可以在不改整体集成逻辑的前提下替换真实数据和核心可视化实现。

## 项目目标

BattleMap 面向“战争/战役时空演化分析”主题，计划分析 1500-1945 年欧洲战争与战役，或进一步聚焦二战主要战役。系统希望回答的问题包括：

- 战役在不同时间阶段如何从局部地区扩散到更大范围。
- 哪些地区是高频冲突区。
- 不同国家或阵营之间的交战关系如何变化。
- 某些战争中战役的空间推进方向是否明显。

当前 Demo 的重点不是最终视觉效果，而是把系统架构和协作接口先稳定下来。

## 当前功能

- React + Vite + TypeScript 项目骨架。
- mock 战役、战争、参战方数据。
- 全局筛选器：
  - 按战争筛选。
  - 按年份范围筛选。
  - 按参战方筛选。
- 地图视图占位组件 `MapView`。
- 时间轴视图占位组件 `TimelineView`。
- 参战方网络图占位组件 `NetworkView`。
- 统计面板 `StatisticsPanel`。
- 战役详情面板 `DetailPanel`。
- case study 快捷筛选区 `CaseStudyPanel`。
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

预览构建结果：

```bash
npm run preview
```

## 目录结构

```text
.
├── src
│   ├── App.tsx
│   ├── components
│   │   ├── filters
│   │   ├── layout
│   │   ├── panels
│   │   └── views
│   ├── data
│   │   └── mockData.ts
│   ├── hooks
│   │   └── useBattleData.ts
│   ├── lib
│   │   ├── battleAnalytics.ts
│   │   └── battleAnalytics.test.ts
│   ├── main.tsx
│   ├── styles.css
│   └── types
│       └── domain.ts
├── topic.pdf
├── package.json
└── vite.config.ts
```

## 数据模型

核心类型定义在 `src/types/domain.ts`。

```ts
type Battle = {
  id: string;
  name: string;
  warId: string;
  year: number;
  startDate?: string;
  endDate?: string;
  latitude: number;
  longitude: number;
  locationName?: string;
  participants: string[];
  result?: string;
  type?: string;
  description?: string;
};

type War = {
  id: string;
  name: string;
  startYear: number;
  endYear: number;
  description?: string;
};

type Participant = {
  id: string;
  name: string;
  side?: string;
  type?: "country" | "empire" | "alliance" | "other";
};
```

## 数据接口约定

当前 `src/hooks/useBattleData.ts` 返回 mock 数据。A 成员后续接入 Wikidata/CSV 后，只需要保持这个 hook 的返回结构不变：

```ts
useBattleData(): {
  battles: Battle[];
  wars: War[];
  participants: Participant[];
  loading: boolean;
  error: Error | null;
};
```

建议真实数据文件保持以下语义：

- `battles.csv`：战役事件主表。
- `wars.csv`：战争元信息表。
- `participants.csv`：参战方信息表。

只要清洗后的字段能映射到 `Battle`、`War`、`Participant`，C 的页面集成和 B 的组件接口就不需要重写。

## 组件接口约定

B 成员后续可以替换地图、时间轴和网络图内部实现，但建议保持 props 接口稳定：

```tsx
<MapView
  battles={filteredBattles}
  selectedBattleId={selectedBattleId}
  onSelectBattle={setSelectedBattleId}
/>

<TimelineView
  battles={filteredBattles}
  selectedBattleId={selectedBattleId}
  selectedYearRange={selectedYearRange}
  onSelectBattle={setSelectedBattleId}
  onYearRangeChange={setSelectedYearRange}
/>

<NetworkView
  battles={filteredBattles}
  participants={participants}
  selectedParticipant={selectedParticipant}
  onSelectParticipant={setSelectedParticipant}
/>
```

这样地图、时间轴、网络图可以通过同一套全局状态联动。

## 分工边界

成员 A 重点负责：

- Wikidata SPARQL 查询。
- 原始数据下载和清洗。
- `battles.csv`、`wars.csv`、`participants.csv` 构建。
- 坐标清洗与校准。
- 后续替换 `useBattleData` 的真实数据读取逻辑。
- 地图视图的真实数据表达。

成员 B 重点负责：

- `TimelineView` 的正式实现。
- `NetworkView` 的正式实现。
- 时间轴与网络图的交互细节。
- 战役、战争、参战方之间的关系构建。

成员 C 重点负责：

- React/Vite 项目框架。
- 页面整体布局。
- 全局筛选器和状态管理。
- `StatisticsPanel`、`DetailPanel`、`CaseStudyPanel`。
- 组件集成、UI 统一、部署和 README。

## 后续开发建议

1. A 先输出一版小规模真实 CSV，并保证字段能映射到当前类型。
2. C 将 `useBattleData` 从 mock 数据替换为 CSV 读取。
3. B 在现有 props 基础上替换 `TimelineView` 和 `NetworkView` 内部实现。
4. A 或 B 替换 `MapView` 为真实地图组件。
5. C 补充 GitHub Pages 部署配置、AI 使用声明、答辩材料和 demo 视频。

## 技术栈

- React
- Vite
- TypeScript
- Vitest
- lucide-react

## 备注

当前版本是系统壳子与协作接口 Demo，不代表最终可视化质量。真实数据接入后，需要进一步检查缺失坐标、缺失时间、参战方命名不一致、同一战役多地点等数据问题。
