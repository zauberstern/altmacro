import { expect, test } from "@playwright/test";

type Probe = {
  country: string;
  month: string;
  scenario: string | null;
  published: { x: string; y: number }[];
  fork: { x: string; y: number }[] | null;
  last: number;
};

async function probe(page: import("@playwright/test").Page): Promise<Probe> {
  return page.evaluate(() => (window as unknown as { __altmacro: Probe }).__altmacro);
}

test("France card moves the last yield and leaves earlier points", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/altmacro/");
  await page.waitForFunction(() => (window as unknown as { __altmacro?: Probe }).__altmacro?.country === "FRA");

  const names = await page.locator("#country option").evaluateAll((els) => els.slice(0, 5).map((el) => el.textContent ?? ""));
  expect(names[0]).toBe("France");
  for (const name of names) expect(name).not.toMatch(/^[A-Z]{3}$/);
  await expect(page.getByText("SPX")).toHaveCount(0);
  await expect(page.getByText(/devaluation/i)).toHaveCount(0);
  await expect(page.getByText(/OAT Bund spread \d+\.\d bp/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Pick an earlier month. Today is already the last point." })).toBeDisabled();

  await page.getByRole("button", { name: "Copy share link" }).click();
  await expect(page.getByRole("button", { name: "Link copied." })).toBeVisible();

  const before = await probe(page);
  const earlier = before.published.find((point) => point.y > 6)?.x;
  expect(earlier).toBeTruthy();
  await page.selectOption("#play-month", earlier!);
  await page.getByRole("button", { name: "Play", exact: true }).click();

  const after = await probe(page);
  expect(after.scenario).toBe("hold-10y");
  expect(after.published).toEqual(before.published);
  expect(after.fork?.filter((point) => point.x < earlier!)).toEqual([]);
  expect(Math.abs(after.last - before.last)).toBeGreaterThan(0.5);
  await expect(page.getByText(`Today's 10-year yield is ${after.last.toFixed(2)}%`)).toBeVisible();
});
