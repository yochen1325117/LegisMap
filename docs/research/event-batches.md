# 立委事蹟研究批次

網站逐縣市發布已查證的事件資料。第一批是 `data/research/events-keelung-2026.json`，涵蓋基隆市名單中的林沛祥；第二批是 `data/research/events-taipei-2026.json`，涵蓋臺北市 8 位委員；第三批是 `data/research/events-new-taipei-2026.json`，涵蓋新北市 12 位委員與 13 則事件；第四批是 `data/research/events-taoyuan-2026.json`，涵蓋桃園市 6 位委員與 16 則事件；第五批是 `data/research/events-hsinchu-county-2026.json`，涵蓋新竹縣 2 位委員與 7 則事件；第六批是 `data/research/events-hsinchu-city-2026.json`，涵蓋新竹市 1 位委員與 5 則事件；第七批是 `data/research/events-miaoli-2026.json`，涵蓋苗栗縣 2 位委員與 7 則事件；第八批是 `data/research/events-taichung-2026.json`，涵蓋臺中市 8 位委員與 15 則事件；第九批是 `data/research/events-changhua-2026.json`，涵蓋彰化縣 4 位委員與 8 則事件；第十批是 `data/research/events-nantou-2026.json`，涵蓋南投縣 2 位委員與 8 則事件；第十一批補上先前順序遺漏的 `data/research/events-yilan-2026.json`，涵蓋宜蘭縣 1 位委員與 5 則事件；第十二批是 `data/research/events-hualien-2026.json`，涵蓋花蓮縣 1 位委員與 5 則事件；第十三批是 `data/research/events-yunlin-2026.json`，涵蓋雲林縣 2 位委員與 6 則事件；第十四批是 `data/research/events-chiayi-city-2026.json`，涵蓋嘉義市 1 位委員與 5 則事件；第十五批是 `data/research/events-chiayi-county-2026.json`，涵蓋嘉義縣 2 位委員與 8 則事件。名單快照的基準日仍是 2026-09-17，事件批次的查閱日另記為 2026-09-19。

後續每批新增 `data/research/events-<region>-<date>.json`。先由北往南處理本島縣市，東部縣市按緯度併入；最後處理澎湖、金門、連江與不分區、平地原住民、山地原住民席次。每批必須涵蓋該地區名單中的所有委員，完成貢獻、正面事蹟、爭議及逸聞四類查核。找不到可靠資料的類別可留空。

每則事件只寫來源可核實的行為、當事人角色及結果。提案、連署、質詢、補助核定及工程完工不得互相推定。爭議要區分主張、正式程序及結果，附當事人回應；選舉公報刊載的罷免理由屬提出人的主張，不等於主管機關認定。來源記錄直接網址、標題、發布者、頁面位置及查閱日期。事件日期須落在該批查閱日前五年內；只有報導日期可核實時，摘要必須說明日期代表報導發表日。

執行 `npm run data:validate`、`npm run typecheck`、`npm run test`、`npm run build` 與 `npm run test:browser`。驗證器檢查結構與來源引用；內容仍須逐則人工核對。新增批次後，確認人物頁的來源連結及重新整理載入正常。
