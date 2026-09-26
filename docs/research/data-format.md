# 第 11 屆立委 2026 年快照

`data/research/ly11-2026.json` 是網站使用的靜態快照，基準日為 2026-09-17。範圍是 2026-01-01 至基準日曾在職的委員。當日立法院名單有 113 位現任、10 位離職；其中 7 位離職日期落在 2026 年，因此公開人物共 120 位。2026 年前離職的 3 位保留在 `roster.former` 與原始擷取，但不在 `members`。

`profile-capture.json` 是逐頁打開立法院官方個人頁後取得的姓名、個人頁 URL、選區、到職日及離職生效日。民國年在建立快照時轉為 ISO 日期。`build-2026-data.mjs` 會從擷取檔產生快照；更新官方資料時，必須重新核對每個頁面、修改擷取檔、調整基準日，再執行產生程式。不可只更改日期沿用舊名單。

快照使用官方個人頁 `nodeid` 作為人物 ID（例如 `ly11-46752`）。`roster` 保留名單頁的現任與離職完整分組。`members` 僅保留本次 2026 年範圍，包含官方選區文字、席次類型、縣市分類、`electoralDistrictId`、任職狀態及到離職日期。區域委員的 `electoralDistrictId` 必須對應 `apps/web/src/data/electoral-districts.json` 的一個穩定 ID；不分區與原住民席次的 `regionName` 及 `electoralDistrictId` 必須是 `null`。

每位人物的 `fieldSourceIds` 指向同檔 `sources`。姓名同時引用立法院名單及個人頁；選區、到職與離職日期引用個人頁；任職狀態引用名單及個人頁。來源保存標題、發布者、直接 URL、查閱日期及頁面位置。網站在對應欄位旁顯示來源連結。

執行 `npm run data:validate` 檢查名單覆蓋、日期、ID、重複、欄位內容與來源引用。檢查不能證明官網內容正確，也不能取代更新時的逐頁人工查核。舊版研究批次模板及驗證器保留供未來擴充事件資料使用，可透過 `npm run data:validate:legacy -- <file>` 執行。
