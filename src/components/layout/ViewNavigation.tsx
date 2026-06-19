import { useEffect, useState } from "react";
import { BarChart3, ChartNoAxesCombined, Copy, Map, Share2 } from "lucide-react";

const viewLinks = [
  { href: "#timeline-overview", label: "时间", icon: BarChart3 },
  { href: "#map-view", label: "地图", icon: Map },
  { href: "#network-view", label: "关系", icon: Share2 },
  { href: "#analysis-view", label: "分析", icon: ChartNoAxesCombined },
];

type ViewNavigationProps = {
  onCopyLink: () => void;
};

export function ViewNavigation({ onCopyLink }: ViewNavigationProps) {
  const [activeView, setActiveView] = useState(window.location.hash || "#timeline-overview");

  useEffect(() => {
    const elements = viewLinks
      .map(({ href }) => document.querySelector<HTMLElement>(href))
      .filter((element): element is HTMLElement => Boolean(element));
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

        if (visibleEntry) {
          setActiveView(`#${visibleEntry.target.id}`);
        }
      },
      { rootMargin: "-18% 0px -62% 0px", threshold: [0, 0.15, 0.4] },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  function handleNavigation(href: string) {
    const target = document.querySelector<HTMLElement>(href);
    if (!target) {
      return;
    }

    setActiveView(href);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${href}`);
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <nav className="view-navigation" aria-label="视图快速导航">
      {viewLinks.map(({ href, label, icon: Icon }) => (
        <a
          key={href}
          href={href}
          className={activeView === href ? "active" : ""}
          aria-current={activeView === href ? "location" : undefined}
          onClick={(event) => {
            event.preventDefault();
            handleNavigation(href);
          }}
        >
          <Icon size={16} />
          <span>{label}</span>
        </a>
      ))}
      <button type="button" className="view-copy-button" onClick={onCopyLink} title="复制当前分析链接">
        <Copy size={16} />
        <span className="sr-only">复制当前分析链接</span>
      </button>
    </nav>
  );
}
