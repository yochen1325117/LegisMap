# 初始架構決策

## 2026-09-27：第 11 屆選區疊圖與人物 dialog

中選會第 11 屆選舉區範圍與國土測繪中心 112 年 9 月村里界固定為專案內的可重現快照。建置腳本以官方行政區／村里清單合併 geometry、量化為 WGS84，並按縣市輸出供動態匯入；驗證器檢查 73 區與代表一對一、22 縣市席次、原始檔 SHA-256、座標、來源 polygon 完整分割及已知村里切分案例。

網址同時保存縣市、選區與人物狀態。縣市底圖和選區 GeoJSON 是兩個獨立圖層，選取樣式不依賴 hover；人物以原生 modal dialog 疊在既有畫面上，右側名單與地圖實例不會被人物內容替換。

## 2026-09-17：接入官方姓名與選區快照

公開畫面改讀 `data/research/ly11-2026.json`，資料按實際查閱日固定成靜態快照。姓名、選區及任職資訊逐欄對應立法院名單或個人頁來源。公開人物為 2026-01-01 至基準日曾在職者；完整現任／離職名單另外保留供覆蓋率驗證。網站按縣市列出區域席次，不分區及原住民席次只在全台名單列出。此決策當時尚未包含真實選區 geometry，已由 2026-09-27 的決策取代。

## 2026-09-16：先交付純前端 mock 原型

此版使用 npm workspaces 管理 `apps/web`、`packages/shared-types` 與 `packages/electoral-map`。Web 由 React Router 的網址驅動畫面選取。重新整理與瀏覽器歷史紀錄因此可重建地圖、疊圖高亮與資料面板。

Taiwan-Atlas v0.2.0 提供行政區邊界、台灣到縣市到鄉鎮市區的導覽，以及 GeoJSON 疊圖能力。LegisMap 的 `ElectoralDistrict.geometry` 由應用程式傳入；`MapNode` 表示行政區，兩者不共用 ID 或邊界。`packages/electoral-map` 只處理這兩種資料之間的明確對應。

展示資料全部放在 `apps/web/src/data/mock.ts`，並使用 `mock: true` 標記。來源連到 `apps/web/public/mock-sources`。這些資料與地圖形狀都是虛構的，沒有實際政治人物或真實立委選區。未來接入正式資料時需另外建立來源、審核與更新流程，不可直接將 mock 標籤改成正式。

此版不啟動 API、資料庫、爬蟲或 AI worker。`LegisMapRepository` 先定義非同步讀取介面，未來服務可替換 mock 實作。GitHub Pages 僅部署靜態產物，`404.html` 作為乾淨路徑的 SPA fallback。
