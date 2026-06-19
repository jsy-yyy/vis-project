# HCED + CShapes TODO

## 已完成

- 主数据源从 early mock battle data 切换到 HCED conflict events。
- 新增 `scripts/build-hced-conflict-events.mjs`。
- 生成 `public/data/hced/conflict_events.csv`。
- `useBattleData()` 改为读取 HCED CSV，并继续向前端返回 `{ battles, wars, participants, loading, error }`。
- CShapes 脚本改为生成 1886-2003 全球历史边界快照。
- 地图改为 HCED 事件点叠加 CShapes 边界，边界作为历史背景层置于事件点下方。
- 页面文案从 mock battle 口径改为 conflict event 口径。
- conflict group 和 participant 筛选器增加搜索框。
- 前端主数据加载失败时增加重试入口。
- 统计面板长列表改为 Top N 展示，并显示剩余数量。
- 新增 `src/lib/appState.test.ts` 覆盖成员 C 的状态联动辅助逻辑。
- 类型和 analytics 导出层增加 conflict event 语义兼容别名。
- 新增地图、时间、关系和分析区域的吸顶快速导航。
- 移动端筛选面板默认折叠，并显示当前筛选摘要。
- 地图事件类型改为固定语义颜色映射。
- 全局地图表达从矩形网格改为 8° 网格密度气泡。
- 全局视觉配色改为石墨中性色底，使用青绿、珊瑚、蓝和少量琥珀表达状态。
- 关系网络和参战方-冲突组矩阵改为模式切换。
- 统计、详情和案例面板按自身内容高度排列。

## 数据验证

- HCED 输出事件必须包含 `event_id`、`year`、`latitude`、`longitude`。
- `year` 必须在 `1886-2003`。
- `latitude` 必须在 `[-90, 90]`。
- `longitude` 必须在 `[-180, 180]`。
- `event_id` 必须唯一。
- CShapes 只表示国家/领土边界，不表示战线、占领区或控制线。

## 后续优化

1. 将组件、hook 和 analytics 文件名继续逐步重命名为 conflict event 语义；当前已在类型和 analytics 导出层提供兼容别名。
2. 改善 HCED 参与者清洗，合并复数、别名和明显噪声词。
3. 增加端到端交互检查：地图点击、详情联动、空筛选结果、年份筛选与 CShapes 自动快照同步。
4. 在答辩材料中明确区分 conflict event、battle、historical boundary、front line。
5. 将“搜索输入 + 原生 select”重构为可搜索 Combobox。
6. 为 World War II case study 补充可直接展示的分析结论和截图证据。

## 测试计划

- `npm run build:hced`
- `npm run build:cshapes`
- `npm test`
- `npm run build`
- 手动验证：
  - 地图能显示 HCED 事件点。
  - 年份筛选会同步影响事件点和 CShapes 自动快照。
  - 点击事件点能更新详情面板。
  - conflict group、participant、year filters 能联动所有视图。
  - 空筛选结果不会崩溃。
