# LegisMap 委員地圖

LegisMap 是可公開瀏覽的互動原型。畫面中的三位代表、選區形狀、政治事件與來源頁面全是**虛構示範**，不能當作真實選舉或立法院資料。

## 開始使用

需要 Node.js 24 與 npm。從專案根目錄執行：

```sh
npm ci
npm run dev
```

開啟終端機顯示的本機網址。`npm run typecheck`、`npm run test`、`npm run build` 用於驗證。`npm run preview` 可檢查建置結果。`npm run test:browser` 執行瀏覽器互動測試。

Taiwan-Atlas 目前透過固定的 [v0.2.0 GitHub Release tarball](https://github.com/yochen1325117/Taiwan-Atlas/releases/tag/v0.2.0) 安裝，版本 URL 同時記錄於 `apps/web/package.json` 與 lockfile。套件不從 npm registry 下載。

## 畫面與網址

左側行政區 Tree 與地圖雙向連動。點選選區疊圖會開啟該選區，右側可繼續選擇人物並查看虛構事件與本地 mock 來源。手機版使用地區抽屜與資料底部面板。未設定示範選區的行政區會顯示資料空狀態。

路由以網址為選取狀態：`/`、`/region/:id`、`/district/:id`、`/legislator/:id`。在 GitHub Pages 中，前面加上 `/LegisMap`。重新整理、瀏覽器上一頁／下一頁與分享連結可還原選取狀態。Pages 的 `404.html` 複製了入口頁，故深層網址可載入 SPA；首次請求的 HTTP 狀態仍可能是 404。

## 蒐集真實資料

準備使用 ChatGPT 研究委員資料時，請依照 [資料蒐集 Prompt](docs/research/collection-prompt.md)，先用[名單模板](data/templates/roster.template.json)核對全體名單，再用[人物批次模板](data/templates/research-batch.template.json)分批查找，並參照 [資料格式與審核規則](docs/research/data-format.md)。將結果放進 `data/research/`，執行 `npm run data:validate -- data/research/檔名.json` 檢查結構。檢查不會驗證事實真偽；真人資料仍需人工核對後另行接入網站。

## 專案結構

- `apps/web`：React、TypeScript、Vite 畫面與靜態 mock 資料。
- `packages/shared-types`：行政區、選區、人物、事件與來源契約。
- `packages/electoral-map`：行政區到示範選區的 adapter。選區 geometry 與行政區 Tree 分開保存。
- `docs/architecture.md`：架構決策。
- `docs/api-draft.md`：未來資料 API 草案；此版沒有伺服器或 AI worker。

## GitHub Pages

推送 `main` 後，`.github/workflows/pages.yml` 以 Node 24 執行安裝、檢查、建置並部署。也可在 Actions 頁面手動執行。儲存庫 Settings → Pages → Source 應選 **GitHub Actions**。網址為 <https://yochen1325117.github.io/LegisMap/>。
