import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const pagesDir = path.join(projectRoot, "pages-dist");

await rm(pagesDir, { recursive: true, force: true });
await mkdir(pagesDir, { recursive: true });
await cp(path.join(projectRoot, "dist"), path.join(pagesDir, "app"), {
  recursive: true,
});
await cp(
  path.join(projectRoot, "presentation", "dist"),
  path.join(pagesDir, "slides"),
  { recursive: true },
);

await writeFile(
  path.join(pagesDir, "index.html"),
  `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>BattleMap</title>
    <style>
      :root { color-scheme: dark; font-family: "Microsoft YaHei", "Noto Sans CJK SC", sans-serif; }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #0d1418; color: #eef4f2; }
      main { width: min(760px, calc(100% - 48px)); }
      h1 { font-size: clamp(42px, 8vw, 76px); margin-bottom: 10px; }
      p { color: #a9b7b4; font-size: 18px; line-height: 1.7; }
      nav { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 32px; }
      a { color: #0d1418; background: #72d7c7; padding: 13px 20px; border-radius: 10px; text-decoration: none; font-weight: 700; }
      a.secondary { background: #f1b86b; }
    </style>
  </head>
  <body>
    <main>
      <p>BATTLEMAP · 数据可视化导论课程项目</p>
      <h1>全球军事冲突事件的时空可视分析</h1>
      <p>从时间峰值、空间聚集和参战方关系出发，回溯到具体历史事件证据。</p>
      <nav>
        <a href="./app/">打开分析系统</a>
        <a class="secondary" href="./slides/">查看答辩 Slides</a>
      </nav>
    </main>
  </body>
</html>`,
  "utf8",
);
