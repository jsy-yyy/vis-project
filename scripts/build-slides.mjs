import { cp, mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const presentationDir = path.join(projectRoot, "presentation");
const source = path.join(presentationDir, "slides.md");
const theme = path.join(presentationDir, "themes", "battlemap-zju.css");
const dist = path.join(presentationDir, "dist");
const assets = path.join(presentationDir, "assets");
const marp = path.join(
  projectRoot,
  "node_modules",
  "@marp-team",
  "marp-cli",
  "marp-cli.js",
);

const outputs = {
  html: ["index.html", "--html"],
  pdf: ["BattleMap-defense.pdf", "--pdf"],
  pptx: ["BattleMap-defense-base.pptx", "--pptx"],
};

const requested = process.argv[2] ?? "all";
const formats = requested === "all" ? Object.keys(outputs) : [requested];

await mkdir(dist, { recursive: true });

for (const format of formats) {
  const output = outputs[format];
  if (!output) {
    throw new Error(`Unsupported slides format: ${format}`);
  }

  const result = spawnSync(
    process.execPath,
    [
      marp,
      source,
      output[1],
      "--theme-set",
      theme,
      "--allow-local-files",
      "--output",
      path.join(dist, output[0]),
    ],
    { cwd: projectRoot, encoding: "utf8", stdio: "inherit" },
  );

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (formats.includes("html")) {
  await cp(assets, path.join(dist, "assets"), { recursive: true, force: true });
}
