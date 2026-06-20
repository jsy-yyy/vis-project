import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#timeline-overview")).toBeVisible();
});

function analysisModeButton(page: import("@playwright/test").Page, name: "单年度分析" | "多年度分析") {
  return page.locator(".analysis-mode-toggle").getByRole("button", { name });
}

async function expectVisiblePopupFlag(
  popup: import("@playwright/test").Locator,
  src: string,
) {
  await expect(popup.locator(`img.battle-popup-flag[src="${src}"]`).first()).toBeVisible();
}

function visibleBattlePopup(page: import("@playwright/test").Page) {
  return page.locator(".battle-popup-card:visible").first();
}

async function openPopupByDoubleClickingMarker(marker: import("@playwright/test").Locator) {
  await marker.dblclick({ force: true });
  const page = marker.page();
  if (await page.locator(".battle-popup-card:visible").count() === 0) {
    await marker.dispatchEvent("dblclick");
  }
}

test("places the compact timeline before the map and keeps details collapsed", async ({ page }) => {
  const overviewBox = await page.locator("#timeline-overview").boundingBox();
  const mapBox = await page.locator("#map-view").boundingBox();

  expect(overviewBox).not.toBeNull();
  expect(mapBox).not.toBeNull();
  expect(overviewBox!.y).toBeLessThan(mapBox!.y);
  await expect(page.locator("#timeline-details-content")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /展开分析/ })).toHaveAttribute("aria-expanded", "false");
});

test("links year selection and brushing to map state and URL", async ({ page }) => {
  await expect(analysisModeButton(page, "单年度分析")).toHaveAttribute("aria-pressed", "true");
  await page.locator('.timeline-overview-bar[data-year="1944"]').click();
  await expect(page.getByLabel("当前地图年份")).toHaveText("1944");
  await expect(page.getByLabel("拖动选择地图年份")).toHaveValue("1944");
  await expect(page).toHaveURL(/year=1944/);

  const yearSlider = page.getByLabel("拖动选择地图年份");
  await yearSlider.evaluate((element) => {
    const input = element as HTMLInputElement;
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setValue?.call(input, "1900");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(page.getByLabel("当前地图年份")).toHaveText("1900");
  await expect(page).toHaveURL(/year=1900/);

  await analysisModeButton(page, "多年度分析").click();
  await expect(analysisModeButton(page, "多年度分析")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("拉条年份范围")).toHaveText("1900–1900");

  const chart = page.locator(".timeline-overview-chart");
  const bounds = await chart.boundingBox();
  expect(bounds).not.toBeNull();
  const xForYear = (year: number) =>
    bounds!.x + ((year - 1886) / (2003 - 1886)) * bounds!.width;
  const y = bounds!.y + bounds!.height / 2;
  await page.mouse.move(xForYear(1939), y);
  await page.mouse.down();
  await page.mouse.move(xForYear(1945), y, { steps: 6 });
  await page.mouse.up();

  await expect(page).toHaveURL(/start=1939/);
  await expect(page).toHaveURL(/end=1945/);
  await expect(page).toHaveURL(/mode=multi/);
  await expect(page.getByText("年份窗口", { exact: false }).first()).toContainText("1939–1945");
  await expect(page.getByLabel("拖动选择起始年份")).toHaveAttribute("aria-valuenow", "1939");
  await expect(page.getByLabel("拖动选择结束年份")).toHaveAttribute("aria-valuenow", "1945");
});

test("restores legacy ranges as multi-year analysis and switches back to a single year", async ({ page }) => {
  await page.goto("/?year=1900&start=1900&end=1900#timeline-overview");
  await expect(page.getByLabel("当前窗口参考年份")).toHaveText("参考 1900");
  await expect(page.locator(".timeline-state-strip")).toContainText("1900–1900");
  await expect(analysisModeButton(page, "多年度分析")).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/mode=multi/);

  const rangeEnd = page.getByLabel("拖动选择结束年份");
  await rangeEnd.press("ArrowRight");
  await rangeEnd.press("ArrowRight");

  await expect(page.getByLabel("拉条年份范围")).toHaveText("1900–1902");
  await expect(page).toHaveURL(/start=1900/);
  await expect(page).toHaveURL(/end=1902/);

  await analysisModeButton(page, "单年度分析").click();
  await expect(page.getByLabel("当前地图年份")).toHaveText("1902");
  await expect(page.getByLabel("拖动选择地图年份")).toHaveValue("1902");
  await expect(page).toHaveURL(/year=1902/);
  await expect(page).not.toHaveURL(/mode=multi/);
  await expect(page).not.toHaveURL(/start=/);
  await expect(page).not.toHaveURL(/end=/);
});

test("selects a participant from the network combobox and restores shared state", async ({ page }) => {
  await analysisModeButton(page, "多年度分析").click();
  await page.getByRole("button", { name: /恢复全时期/ }).click();

  const search = page.getByRole("combobox", { name: "聚焦参战方" });
  await search.fill("Germany");
  await page.getByRole("option", { name: /Germany/ }).click();

  await expect(page).toHaveURL(/participant=germany/);
  await expect(page.locator(".network-svg-node.active")).toHaveCount(1);
  await expect(page.locator(".timeline-state-strip")).toContainText("Germany");

  await page.reload();
  await expect(search).toHaveValue("Germany");
  await expect(page.locator(".network-svg-node.active")).toHaveCount(1);
});

test("applies the World War II case study with dynamic insight metrics", async ({ page }) => {
  const casePreset = page.locator(".timeline-case-presets");
  await expect(casePreset).toContainText("1944");
  await expect(casePreset).toContainText("124 条事件");
  const applyCaseButton = casePreset.getByRole("button", { name: "应用窗口" });
  await applyCaseButton.scrollIntoViewIfNeeded();
  await applyCaseButton.click({ force: true });

  await expect(page.getByLabel("当前窗口参考年份")).toHaveText("参考 1944");
  await expect(page.locator(".timeline-mode-summary")).toContainText("边界参考 1945");
  await expect(analysisModeButton(page, "多年度分析")).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/mode=multi/);
  await expect(page).toHaveURL(/start=1939/);
  await expect(page).toHaveURL(/end=1945/);
});

test("labels network-only war filtering as a local relationship scope", async ({ page }) => {
  await page.goto("/?mode=multi&year=1944&start=1939&end=1945#network-view");

  await expect(page.getByLabel("网络局部范围")).toContainText("仅关系视图");
  const worldWarTwoValue = await page
    .getByLabel("网络局部范围")
    .locator("option")
    .filter({ hasText: "World War II" })
    .first()
    .getAttribute("value");
  expect(worldWarTwoValue).not.toBeNull();
  await page.getByLabel("网络局部范围").selectOption(worldWarTwoValue!);

  await expect(page.locator(".network-scope-strip")).toContainText("关系网络");
  await expect(page.locator(".network-scope-strip")).toContainText("World War II");
  await expect(page.locator(".network-scope-strip")).toContainText("仅关系视图");
  await expect(page.locator(".timeline-state-strip")).not.toContainText("World War II");
});

test("uses current filter result wording in timeline bar labels", async ({ page }) => {
  await page.goto("/?mode=multi&year=1944&start=1939&end=1945#timeline-overview");

  await expect(page.locator('.timeline-overview-bar[data-year="1900"]')).toHaveAttribute(
    "aria-label",
    /当前筛选结果 0 条/,
  );
  await expect(page.locator('.timeline-overview-bar[data-year="1900"]')).not.toHaveAttribute(
    "aria-label",
    /当前参战方/,
  );
});

test("lets an overlapping range expand in either direction", async ({ page }) => {
  await page.locator('.timeline-overview-bar[data-year="1944"]').click();
  await analysisModeButton(page, "多年度分析").click();

  const startHandle = page.getByLabel("拖动选择起始年份");
  const endHandle = page.getByLabel("拖动选择结束年份");
  await expect(startHandle).toHaveAttribute("aria-valuenow", "1944");
  await expect(endHandle).toHaveAttribute("aria-valuenow", "1944");

  await startHandle.press("ArrowLeft");
  await expect(startHandle).toHaveAttribute("aria-valuenow", "1943");
  await endHandle.press("ArrowRight");
  await expect(endHandle).toHaveAttribute("aria-valuenow", "1945");
});

test("heatmap cells apply both participant and year period filters", async ({ page }) => {
  await page.goto("/?mode=multi&year=1944&start=1939&end=1945#network-view");

  await page.getByRole("tab", { name: /参战方年度热力图/ }).click();
  await page.getByRole("button", { name: /Germany 在 1944 中有/ }).click();

  await expect(page).toHaveURL(/participant=germany/);
  await expect(page).toHaveURL(/start=1944/);
  await expect(page).toHaveURL(/end=1944/);
  await expect(page.locator(".timeline-state-strip")).toContainText("1944–1944");
  await expect(page.locator(".timeline-state-strip")).toContainText("Germany");
});

test("drills from a multi-year heat bubble into event details", async ({ page }) => {
  await page.goto("/?mode=multi&year=1944&start=1939&end=1945#map-view");
  await expect(page.locator(".map-layer-mode")).toContainText("点击气泡下钻到事件点");
  await expect(page.locator(".boundary-control")).toHaveCount(0);
  await expect(page.locator(".map-legend")).toHaveCount(0);
  await expect(page.locator(".map-year-feedback")).toContainText("CShapes 快照");

  await page.locator(".density-bubble").first().click({ force: true });
  await expect(page.locator(".map-layer-mode")).toContainText("点击事件点查看详情");
  await expect(page.locator(".battle-marker").first()).toBeAttached();

  const visibleMarkerIndex = await page.locator(".battle-marker").evaluateAll((markers) =>
    markers.findIndex((marker) => {
      const box = marker.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && box.left >= 0 && box.top >= 0;
    }),
  );
  expect(visibleMarkerIndex).toBeGreaterThanOrEqual(0);
  await page.locator(".battle-marker").nth(visibleMarkerIndex).dispatchEvent("click");

  await expect(page).toHaveURL(/event=/);
  await expect(page.locator(".detail-panel h3")).not.toBeEmpty();
  await expect(page.locator(".network-svg-node.event-highlighted").first()).toBeAttached();
  await expect(page.locator(".network-event-status")).toContainText(/当前事件/);
});

test("opens the same flag matchup popup when double-clicking single- and multi-year event points", async ({ page }) => {
  await page.goto("/?year=1913#map-view");
  const singleHeatCell = page.locator('.density-bubble[data-event-ids~="Bregalnica1913"]');
  await expect(singleHeatCell).toHaveCount(1);
  await singleHeatCell.click({ force: true });

  const singleMarker = page.locator('.battle-marker[data-event-id="Bregalnica1913"]');
  await expect(singleMarker).toBeVisible();
  await openPopupByDoubleClickingMarker(singleMarker);
  const singlePopup = visibleBattlePopup(page);
  await expect(singlePopup).toBeVisible();
  await expect(singlePopup).toContainText("VS");
  await expectVisiblePopupFlag(singlePopup, "/flags/iso/rs.svg");
  await expectVisiblePopupFlag(singlePopup, "/flags/iso/bg.svg");

  await page.goto("/?mode=multi&year=1944&start=1939&end=1945#map-view");
  const multiHeatCell = page.locator('.density-bubble[data-event-ids~="Agordat1941"]');
  await expect(multiHeatCell).toHaveCount(1);
  await multiHeatCell.click({ force: true });

  const multiMarker = page.locator('.battle-marker[data-event-id="Agordat1941"]');
  await expect(multiMarker).toBeVisible();
  await page.waitForTimeout(600);
  await openPopupByDoubleClickingMarker(multiMarker);
  const multiPopup = visibleBattlePopup(page);
  await expect(multiPopup).toBeVisible();
  await expect(page).toHaveURL(/event=Agordat1941/);
  await expect(multiPopup).toContainText("United Kingdom");
  await expect(multiPopup).toContainText("Italy");
  await expect(multiPopup).toContainText("VS");
  await expectVisiblePopupFlag(multiPopup, "/flags/united-kingdom.svg");
  await expectVisiblePopupFlag(multiPopup, "/flags/italy-kingdom.svg");
  await page.waitForTimeout(500);
  await expect(multiPopup).toBeVisible();
});

test("expands details on demand and links an event to detail and network highlighting", async ({ page }) => {
  await page.getByRole("button", { name: /展开分析/ }).click();
  await expect(page.locator("#timeline-details-content")).toBeVisible();

  const firstEvent = page.locator(".timeline-track .timeline-item").first();
  await expect(firstEvent).toBeVisible();
  await firstEvent.click();

  await expect(page).toHaveURL(/event=/);
  await expect(page.locator(".detail-panel h3")).not.toBeEmpty();
  await expect(page.locator(".network-svg-node.event-highlighted").first()).toBeVisible();
});

test("renders visual timeline details and keeps analysis panels aligned", async ({ page }) => {
  await page.getByRole("button", { name: /展开分析/ }).click();
  await expect(page.locator(".timeline-stacked-bars")).toBeVisible();
  await expect(page.getByRole("heading", { name: "主要参战方" })).toHaveCount(0);
  await expect(page.locator(".type-share-bar")).toBeVisible();

  const panels = page.locator(".sidebar-grid > .side-panel");
  await expect(panels).toHaveCount(2);
  const firstBox = await panels.nth(0).boundingBox();
  const secondBox = await panels.nth(1).boundingBox();
  expect(firstBox).not.toBeNull();
  expect(secondBox).not.toBeNull();

  if ((await page.viewportSize())!.width > 720) {
    expect(Math.abs(firstBox!.height - secondBox!.height)).toBeLessThanOrEqual(1);
  }

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("renders ISO flags in the battle popup instead of blank tiles", async ({ page }) => {
  await page.goto("/?year=1913&event=Bregalnica1913&locked=1#map-view");

  const popup = page.locator(".battle-popup-card:visible").first();
  await expectVisiblePopupFlag(popup, "/flags/iso/rs.svg");
  await expectVisiblePopupFlag(popup, "/flags/iso/bg.svg");

  expect(
    await popup.locator("img.battle-popup-flag").evaluateAll((flags) =>
      flags.every((element) => {
        const image = element as HTMLImageElement;
        return image.complete && image.naturalWidth > 0;
      }),
    ),
  ).toBe(true);
});
