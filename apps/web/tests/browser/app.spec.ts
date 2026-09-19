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

test('Keelung profile shows four sourced research categories after reload', async ({ page }) => {
  await page.goto('/legislator/ly11-46778');
  await expect(page.getByRole('heading', { name: '林沛祥' })).toBeVisible();
  for (const heading of ['立委貢獻', '正面事蹟', '爭議事件', '逸聞']) {
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  }
  await expect(page.getByRole('link', { name: /立法院・立法院交通委員會考察基隆地區交通及重大公共建設紀錄/ }).first()).toHaveAttribute('href', /ppg\.ly\.gov\.tw/);
  await page.reload();
  await expect(page.getByRole('heading', { name: '罷免理由與答辯中的問政爭議' })).toBeVisible();
});

test('Taipei profiles load sourced events and explain empty categories', async ({ page }) => {
  await page.goto('/legislator/ly11-46766');
  await expect(page.getByRole('heading', { name: '吳沛憶' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '運動基金協助小學空手道隊' })).toBeVisible();
  await expect(page.getByRole('link', { name: /中央通訊社・吳沛憶捐選舉補助款設運動基金/ })).toHaveAttribute('href', /cna\.com\.tw/);
  await page.goto('/legislator/ly11-46859');
  await expect(page.getByRole('heading', { name: '羅智強' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '提出立法委員行為法修正草案' })).toBeVisible();
  await expect(page.getByText('截至 2026-09-19 尚無已核實資料。')).toHaveCount(3);
  await page.reload();
  await expect(page.getByRole('heading', { name: '羅智強' })).toBeVisible();
});

test('New Taipei county and profile retain sourced events after reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '新北市', exact: true }).click();
  await expect(page.getByRole('heading', { name: '新北市' })).toBeVisible();
  await page.getByRole('button', { name: /蘇巧慧.*新北市第5選舉區/ }).click();
  await expect(page).toHaveURL(/\/legislator\/ly11-46860$/);
  await expect(page.getByRole('heading', { name: '提出兒童托育服務法草案' })).toBeVisible();
  await expect(page.getByRole('link', { name: /立法院・兒童托育服務法草案/ })).toHaveAttribute('href', /ppg\.ly\.gov\.tw/);
  await page.reload();
  await expect(page.getByRole('heading', { name: '蘇巧慧' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '分送春聯並決定加印' })).toBeVisible();
});

test('Taoyuan profiles show multiple events in a category and preserve links after reload', async ({ page }) => {
  await page.goto('/legislator/ly11-46836');
  await expect(page.getByRole('heading', { name: '萬美玲' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '持續舉辦捐髮活動協助癌症病友' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '舉辦技專校院升學講座' })).toBeVisible();
  await expect(page.getByRole('link', { name: /中央通訊社・捐髮活動助癌症病友/ })).toHaveAttribute('href', /cna\.com\.tw/);
  await page.goto('/legislator/ly11-46757');
  await expect(page.getByRole('heading', { name: '試用期八成薪條文引起爭議後刪除' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: '受訪談領養貓UNO' })).toBeVisible();
});

test('Hsinchu County profiles show sources and reload correctly', async ({ page }) => {
  await page.goto('/legislator/ly11-46782');
  await expect(page.getByRole('heading', { name: '林思銘' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '號召募集花蓮災區物資' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '罷免理由與答辯中的問政爭議' })).toBeVisible();
  await expect(page.getByRole('link', { name: /中央選舉委員會・第11屆立法委員新竹縣第2選舉區林思銘罷免案公告內容/ })).toHaveAttribute('href', /web\.cec\.gov\.tw/);
  await page.goto('/legislator/ly11-46797');
  await expect(page.getByRole('heading', { name: '媒合二手電腦供弱勢學生使用' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: '徐欣瑩' })).toBeVisible();
});

test('Hsinchu City profile shows multiple sourced proposals and controversy statuses', async ({ page }) => {
  await page.goto('/legislator/ly11-46845');
  await expect(page.getByRole('heading', { name: '鄭正鈐' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '提出核子反應器設施管制法修正草案' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '共同提出產業創新條例修正草案' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '借款民事訴訟二審判返還1357萬餘元' })).toBeVisible();
  await expect(page.getByRole('link', { name: /立法院・核子反應器設施管制法/ })).toHaveAttribute('href', /ppg\.ly\.gov\.tw/);
  await expect(page.getByRole('link', { name: /中央通訊社・鄭正鈐為選舉借款未還/ })).toHaveAttribute('href', /cna\.com\.tw/);
  await expect(page.getByText('截至 2026-09-19 尚無已核實資料。')).toHaveCount(2);
  await page.reload();
  await expect(page.getByRole('heading', { name: '鄭正鈐' })).toBeVisible();
});

test('Miaoli profiles show sourced events and preserve direct URLs after reload', async ({ page }) => {
  await page.goto('/legislator/ly11-46790');
  await expect(page.getByRole('heading', { name: '邱鎮軍' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '參與文山國小弱勢學子捐款' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '立法院議場衝突遭依傷害罪起訴' })).toBeVisible();
  await expect(page.getByRole('link', { name: /苗栗縣文山國小・【大愛助學 · 點亮希望】感謝函/ })).toHaveAttribute('href', /wenshanes\.mlc\.edu\.tw/);
  await page.goto('/legislator/ly11-46822');
  await expect(page.getByRole('heading', { name: '陳超明' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '涉貪案件二審改判無罪' })).toBeVisible();
  await expect(page.getByRole('link', { name: /中央通訊社・陳超明、徐永明等涉貪案無罪/ })).toHaveAttribute('href', /cna\.com\.tw/);
  await page.reload();
  await expect(page.getByRole('heading', { name: '陳超明' })).toBeVisible();
  await expect(page.getByText('截至 2026-09-19 尚無已核實資料。')).toHaveCount(2);
});

test('Taichung profiles show sourced events and current case status after reload', async ({ page }) => {
  await page.goto('/legislator/ly11-46855');
  await expect(page.getByRole('heading', { name: '顏寬恒' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '助理費涉貪案最高法院撤銷發回' })).toBeVisible();
  await expect(page.getByRole('link', { name: /中央通訊社.*顏寬恒/ }).first()).toHaveAttribute('href', /cna\.com\.tw/);
  await page.reload();
  await expect(page.getByRole('heading', { name: '提出性別平等工作法增訂條文草案' })).toBeVisible();
  await page.goto('/legislator/ly11-46842');
  await expect(page.getByRole('heading', { name: '號召基層棒球器材補助計畫' })).toBeVisible();
  await expect(page.getByRole('link', { name: /TAIWOLF/ })).toHaveAttribute('href', /taiwolf\.com/);
});

test('Changhua profiles show sourced deeds and preserve direct URLs after reload', async ({ page }) => {
  await page.goto('/legislator/ly11-46851');
  await expect(page.getByRole('heading', { name: '謝衣鳯' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '以家族基金會名義捐贈彰化家扶年菜' })).toBeVisible();
  await expect(page.getByRole('link', { name: /彰化家扶中心/ })).toHaveAttribute('href', /ccf\.org\.tw/);
  await page.goto('/legislator/ly11-46818');
  await expect(page.getByRole('heading', { name: '邀集友人為創世基金會彰化分會募款' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: '提出老年農民福利津貼修正草案' })).toBeVisible();
});

test('Nantou profiles distinguish accusations and recall outcomes after reload', async ({ page }) => {
  await page.goto('/legislator/ly11-46800');
  await expect(page.getByRole('heading', { name: '馬文君' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '潛艦資料涉洩密指控遭告發' })).toBeVisible();
  await expect(page.getByRole('link', { name: /公視新聞網/ })).toHaveAttribute('href', /news\.pts\.org\.tw/);
  await page.reload();
  await expect(page.getByRole('heading', { name: '罷免理由與答辯中的國防預算爭議' })).toBeVisible();
  await page.goto('/legislator/ly11-46826');
  await expect(page.getByRole('heading', { name: '捐書予南投偏鄉三所國小' })).toBeVisible();
  await expect(page.getByRole('link', { name: /救國團南投縣團委會/ })).toHaveAttribute('href', /cna\.com\.tw\/postwrite/);
});

test('Yilan profile shows four sourced categories and the prior-term caveat', async ({ page }) => {
  await page.goto('/legislator/ly11-46816');
  await expect(page.getByRole('heading', { name: '陳俊宇' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '與縣議員聯合服務處義賣盆景助弱勢' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '楊桃集貨場住宅使用爭議再受質疑' })).toBeVisible();
  await expect(page.getByText(/第11屆立委任期前/)).toBeVisible();
  await expect(page.getByRole('link', { name: /菱傳媒/ })).toHaveAttribute('href', /rwnews\.tw/);
  await page.reload();
  await expect(page.getByRole('heading', { name: '服務處掛小學老師所贈' })).toBeVisible();
});

test('Hualien profile distinguishes constitutional review from personal liability', async ({ page }) => {
  await page.goto('/legislator/ly11-46824');
  await expect(page.getByRole('heading', { name: '傅崐萁' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '領銜國會職權修法部分條文遭判違憲' })).toBeVisible();
  await expect(page.getByText(/不是對傅崐萁個人的刑事裁判/)).toBeVisible();
  await expect(page.getByRole('link', { name: /憲法法庭/ }).first()).toHaveAttribute('href', /cons\.judicial\.gov\.tw/);
  await page.reload();
  await expect(page.getByRole('heading', { name: '罷免理由與答辯中的花東交通及問政爭議' })).toBeVisible();
});

test('Yunlin profiles retain sourced events after direct load and reload', async ({ page }) => {
  await page.goto('/legislator/ly11-46752');
  await expect(page.getByRole('heading', { name: '丁學忠' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '罷免理由與答辯中的問政爭議' })).toBeVisible();
  await expect(page.getByRole('link', { name: /中央選舉委員會/ }).first()).toHaveAttribute('href', /web\.cec\.gov\.tw/);
  await page.reload();
  await expect(page.getByRole('heading', { name: '提出土石採取法第36條修正草案' })).toBeVisible();
  await page.goto('/legislator/ly11-46841');
  await expect(page.getByRole('heading', { name: '劉建國' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '協助為花蓮洪災募物並響應捐款' })).toBeVisible();
});
