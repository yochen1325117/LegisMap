# LegisMap 研究資料格式 1.0.0

先依 `roster.template.json` 建立官方名單，再以 `research-batch.template.json` 分批蒐集人物，每批建議 5–10 位。JSON 使用 UTF-8、ISO `YYYY-MM-DD` 日期與直接來源 URL。批次保留 `reviewStatus: "pending"`，直到人工逐筆核對後才改為 `approved`，並填 `reviewedBy` 和 `reviewedAt`。執行 `npm run data:validate -- data/research` 可檢查資料夾內所有 JSON 的格式、ID、來源引用、現任委員覆蓋率及跨批重複。此檢查**不能證明內容真實**。

## 名單與地理

`members[].id` 由「屆別 + 官方個人頁 nodeid」組成，例如 `ly11-46752`；不得由姓名推測。`mandateStatus` 為 `active` 或 `former`，以 `asOfDate` 的立法院名單判定。`seatType` 為 `district`、`plains_indigenous`、`mountain_indigenous`、`party_list`。`districtLabel` 是官方文字，`electoralDistrictId` 是 LegisMap 選區圖層的 ID，缺少可靠對照時填 `null`。`regionNodeIds` 只放已核對的 Taiwan-Atlas 行政區 ID。原住民及不分區席次不得虛構縣市 polygon。

`fieldSourceIds` 對應基本欄位的來源 ID，例如 `party`、`education`、`committees`。若欄位缺少可靠來源，欄位填 `null` 或空陣列，並在 `researchNotes` 說明。

## 可核對的行為與爭議

`actions` 表示提案、連署、發言、表決等**具體行為**。`kind` 使用 `proposal`、`co_sign`、`speech`、`vote`、`public_service`、`other`。`role` 必須寫明本人角色；`outcome` 只在另有正式紀錄時填入。不得由參與推論成效。

`concerns` 表示需要交代程序和歸屬的公開爭議或法律紀錄。`processStatus` 使用 `reported`、`investigation`、`indictment`、`trial`、`judgment_nonfinal`、`judgment_final`、`dismissed`、`acquitted`、`corrected`、`resolved`。`summary` 用中性文字敘述「哪個機關／媒體於何時說了什麼」，不可將指控寫成已證明的事實。`personResponse` 記當事人公開回應，`resolution` 記後續結果；查無可靠紀錄時填 `null`，不要自行解讀。

每筆事件的 `sourceIds` 需引用同檔 `sources`。`evidenceLocator` 提供案號、頁碼、會議或段落。`sources[].sourceType` 為 `official`、`court`、`news`、`statement`、`other`。來源 URL 應指向具體紀錄，不是網站首頁。`accessedAt` 是實際查閱日期；無法確認發布日期時 `publishedAt` 填 `null`。同一事件有後續更正時，應更新原事件、附新來源並保留修訂紀錄。

## 與目前網站的關係

目前 `apps/web/src/data/mock.ts` 是虛構展示，`packages/shared-types` 的 mock 型別也明示 `mock: true`。研究 JSON 存在 `data/research/`，**不會自動顯示於 Pages**。正式接入前，需建立經審核的匯入程序、來源卡和法律程序狀態顯示，並移除 mock 專用標示；不要直接複製 JSON 到 mock 檔。
