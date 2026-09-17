import { expect, test } from '@playwright/test';

test('real roster, county navigation, profile field sources, and browser history', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '從地圖，看見你的國會代表。' })).toBeVisible();
  await expect(page.getByText('資料截至 2026-09-17')).toBeVisible();
  await expect(page.getByRole('link', { name: /立法院第 11 屆名單/ })).toHaveAttribute('href', 'https://www.ly.gov.tw/Pages/List.aspx?nodeid=109');
  await expect(page.getByRole('heading', { name: '區域委員' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '此縣市沒有區域席次資料' })).toHaveCount(0);
  await page.getByRole('button', { name: '臺北市', exact: true }).click();
  await expect(page).toHaveURL(/\/region\/63000$/);
  await expect(page.getByRole('heading', { name: '臺北市' })).toBeVisible();
  await page.getByRole('button', { name: /王世堅.*臺北市第2選舉區/ }).click();
  await expect(page).toHaveURL(/\/legislator\/ly11-46758$/);
  await expect(page.getByRole('heading', { name: '王世堅' })).toBeVisible();
  await expect(page.getByRole('link', { name: /姓名來源：立法院 王世堅委員/ })).toHaveAttribute('href', 'https://www.ly.gov.tw/Pages/List.aspx?nodeid=46758');
  await expect(page.getByRole('link', { name: /選區來源：立法院 王世堅委員/ })).toHaveAttribute('href', 'https://www.ly.gov.tw/Pages/List.aspx?nodeid=46758');
  await page.reload();
  await expect(page.getByRole('heading', { name: '王世堅' })).toBeVisible();
  const mapReturn = page.getByRole('button', { name: '返回全台', exact: true });
  await expect(mapReturn).toBeEnabled();
  await mapReturn.click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: '全台灣' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '區域委員' })).toBeVisible();
});

test('special seats and former member are accessible on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '全國不分區及僑居國外國民' })).toBeVisible();
  await page.getByRole('button', { name: /黃國昌.*2026 年離職/ }).click();
  await expect(page).toHaveURL(/\/legislator\/ly11-46832$/);
  await expect(page.getByText('2026-02-01')).toBeVisible();
  await page.getByRole('button', { name: '收合資料' }).click();
  await expect(page.getByRole('button', { name: '查看資料' })).toBeVisible();
});
