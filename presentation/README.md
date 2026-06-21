# BattleMap 答辩 Slides

`slides.md` 是演示内容的唯一主源，使用本地主题
`themes/battlemap-zju.css`。主线为 5 页，之后 4 页为 Q&A 附录。

## 构建

```bash
npm run slides:dev
npm run slides:html
npm run slides:pdf
npm run slides:pptx
npm run slides:build
```

输出位于 `presentation/dist/`：

- `index.html`
- `BattleMap-defense.pdf`
- `BattleMap-defense-base.pptx`

普通 Marp PPTX 使用整页渲染图片，适合保持视觉一致，但不会把 HTML
视频控件转换为 PowerPoint 视频对象。

## 生成正式 PPTX

Windows 且已安装 Microsoft PowerPoint 时执行：

```powershell
.\scripts\embed-demo-video.ps1
```

脚本会把 `assets/demo-short.mp4` 嵌入基础 PPTX 的第 3 页，并生成：

```text
presentation/dist/BattleMap-defense.pptx
```

重新运行 `npm run slides:build` 只会覆盖基础 PPTX，不会覆盖已嵌入视频的
正式文件。视频默认为点击播放、不循环。

## 替换 Demo

现有 `demo-short.mp4` 是由仓库中的真实系统截图生成的 58 秒备用版本。
如果已有人工录制的操作视频，将其转码为 H.264/AAC、1280×720、30 fps，
替换同名文件后重新运行嵌入脚本即可。

备用视频可通过以下命令重建：

```powershell
.\scripts\build-demo-video.ps1
```

## GitHub Pages

工作流将应用部署至 `/vis-project/app/`，将 Marp HTML 部署至
`/vis-project/slides/`。公共数据、历史边界和旗帜资源均通过 Vite
`BASE_URL` 解析，以兼容仓库子路径。
