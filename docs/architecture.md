# 初始架構決策

## 2026-09-16：先交付純前端 mock 原型

此版使用 npm workspaces 管理 `apps/web`、`packages/shared-types` 與 `packages/electoral-map`。Web 由 React Router 的網址驅動畫面選取。重新整理與瀏覽器歷史紀錄因此可重建地圖、疊圖高亮與資料面板。

Taiwan-Atlas v0.2.0 提供行政區邊界、台灣到縣市到鄉鎮市區的導覽，以及 GeoJSON 疊圖能力。LegisMap 的 `ElectoralDistrict.geometry` 由應用程式傳入；`MapNode` 表示行政區，兩者不共用 ID 或邊界。`packages/electoral-map` 只處理這兩種資料之間的明確對應。

展示資料全部放在 `apps/web/src/data/mock.ts`，並使用 `mock: true` 標記。來源連到 `apps/web/public/mock-sources`。這些資料與地圖形狀都是虛構的，沒有實際政治人物或真實立委選區。未來接入正式資料時需另外建立來源、審核與更新流程，不可直接將 mock 標籤改成正式。

此版不啟動 API、資料庫、爬蟲或 AI worker。`LegisMapRepository` 先定義非同步讀取介面，未來服務可替換 mock 實作。GitHub Pages 僅部署靜態產物，`404.html` 作為乾淨路徑的 SPA fallback。
