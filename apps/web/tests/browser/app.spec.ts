import { expect, test } from '@playwright/test';

test('region tree, district, profile, source, and browser history', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '從地圖，看見你的國會代表。' })).toBeVisible();
  await expect(page.getByText('虛構資料展示')).toBeVisible();
  await page.getByRole('button', { name: '臺北市', exact: true }).click();
  await expect(page).toHaveURL(/\/region\/63000$/);
  await expect(page.getByRole('heading', { name: '臺北市' })).toBeVisible();
  await page.getByRole('button', { name: '台北示範選區一', exact: true }).click();
  await expect(page).toHaveURL(/\/district\/TPE-DEMO-01$/);
  await page.getByRole('button', { name: /示範代表 甲/ }).click();
  await expect(page).toHaveURL(/\/legislator\/demo-a$/);
  await expect(page.getByRole('heading', { name: '事件時間軸' })).toBeVisible();
  await expect(page.getByRole('link', { name: /示範提案紀錄 A1/ })).toHaveAttribute('href', /mock-sources\/index\.html#event-a1/);
  await page.reload();
  await expect(page.getByRole('heading', { name: '示範代表 甲' })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/district\/TPE-DEMO-01$/);
  await page.goForward();
  await expect(page).toHaveURL(/\/legislator\/demo-a$/);
});

test('mobile drawer and empty state', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: '地區選單' }).click();
  await page.getByRole('button', { name: '新北市', exact: true }).click();
  await expect(page).toHaveURL(/\/region\/65000$/);
  await expect(page.getByRole('heading', { name: '此區尚無示範人物' })).toBeVisible();
  await page.getByRole('button', { name: '收合資料' }).click();
  await expect(page.getByRole('button', { name: '查看資料' })).toBeVisible();
});
