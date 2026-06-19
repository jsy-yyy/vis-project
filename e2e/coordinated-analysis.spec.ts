import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#timeline-overview")).toBeVisible();
});

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
  await page.locator('.timeline-overview-bar[data-year="1944"]').click();
  await expect(page.getByLabel("当前地图年份")).toHaveText("1944");
  await expect(page).toHaveURL(/year=1944/);

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
  await expect(page.getByText("年份窗口", { exact: false }).first()).toContainText("1939–1945");
});

test("selects a participant from the network combobox and restores shared state", async ({ page }) => {
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
  const caseCard = page.locator(".case-study-card.primary");
  await expect(caseCard).toContainText("450");
  await expect(caseCard).toContainText("1944");
  await expect(caseCard).toContainText("124");
  const applyCaseButton = caseCard.getByRole("button", { name: /应用窗口并定位峰值/ });
  await applyCaseButton.scrollIntoViewIfNeeded();
  await applyCaseButton.click({ force: true });

  await expect(page.getByLabel("当前地图年份")).toHaveText("1944");
  await expect(page).toHaveURL(/start=1939/);
  await expect(page).toHaveURL(/end=1945/);
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
