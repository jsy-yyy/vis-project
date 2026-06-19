import { BarChart3, ChartNoAxesCombined, Map, Share2 } from "lucide-react";

const viewLinks = [
  { href: "#map-view", label: "地图", icon: Map },
  { href: "#timeline-view", label: "时间", icon: BarChart3 },
  { href: "#network-view", label: "关系", icon: Share2 },
  { href: "#analysis-view", label: "分析", icon: ChartNoAxesCombined },
];

export function ViewNavigation() {
  return (
    <nav className="view-navigation" aria-label="视图快速导航">
      {viewLinks.map(({ href, label, icon: Icon }) => (
        <a key={href} href={href}>
          <Icon size={16} />
          <span>{label}</span>
        </a>
      ))}
    </nav>
  );
}
