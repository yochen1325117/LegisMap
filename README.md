# LegisMap 委員地圖

LegisMap 目前展示截至 **2026-09-17** 的第 11 屆立法委員資料，收錄 2026 年內曾在職的 120 位委員。姓名、選區與任職資訊來自立法院名單及個人頁，每個欄位都能在畫面上開啟來源。地圖使用行政區底圖，沒有顯示立委選區邊界。

## 開始使用

需要 Node.js 24 與 npm。從專案根目錄執行：

```sh
npm ci
npm run dev
```

開啟終端機顯示的本機網址。`npm run typecheck`、`npm run test`、`npm run build` 用於驗證。`npm run preview` 可檢查建置結果。`npm run test:browser` 執行瀏覽器互動測試。

Taiwan-Atlas 目前透過固定的 [v0.2.0 GitHub Release tarball](https://github.com/yochen1325117/Taiwan-Atlas/releases/tag/v0.2.0) 安裝，版本 URL 同時記錄於 `apps/web/package.json` 與 lockfile。套件不從 npm registry 下載。

## 畫面與網址

左側縣市清單與地圖連動。右側顯示該縣市的區域立委；全台灣清單另外列出不分區及原住民席次。點選人物可查看姓名、選區、任職狀態及逐欄來源。手機版使用地區抽屜與資料底部面板。

路由以網址為選取狀態：`/`、`/region/:id`、`/legislator/:id`。在 GitHub Pages 中，前面加上 `/LegisMap`。重新整理、瀏覽器上一頁／下一頁與分享連結可還原選取狀態。Pages 的 `404.html` 複製了入口頁，故深層網址可載入 SPA；首次請求的 HTTP 狀態仍可能是 404。

## 蒐集真實資料

本次整理的[原始頁面擷取](data/research/profile-capture.json)及[公開快照](data/research/ly11-2026.json)放在 `data/research/`。更新資料時先逐頁核對[立法院名單](https://www.ly.gov.tw/Pages/List.aspx?nodeid=109)及個人頁，記錄新查閱日期，再執行 `node scripts/build-2026-data.mjs` 和 `npm run data:validate`。驗證器檢查覆蓋率、欄位與來源引用，不能取代頁面內容的人工核對。詳細格式見[研究資料說明](docs/research/data-format.md)。

## 專案結構

- `apps/web`：React、TypeScript、Vite 畫面，讀取已核對的靜態研究快照。
- `data/research`：官方名單與個人頁擷取、逐欄來源及公開快照。
- `packages/shared-types`、`packages/electoral-map`：前一版地圖原型的型別與選區 adapter，現行公開畫面未使用選區 geometry。
- `docs/architecture.md`：架構決策。
- `docs/api-draft.md`：未來資料 API 草案；此版沒有伺服器或 AI worker。

## GitHub Pages

推送 `main` 後，`.github/workflows/pages.yml` 以 Node 24 執行安裝、檢查、建置並部署。也可在 Actions 頁面手動執行。儲存庫 Settings → Pages → Source 應選 **GitHub Actions**。網址為 <https://yochen1325117.github.io/LegisMap/>。
