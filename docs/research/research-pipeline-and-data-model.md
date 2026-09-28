# 立委資料主蒐集流程與資料模型

## 目的

本文件定義人物事件的主蒐集流程、候選資料格式、發布門檻及重新查核方式。主流程負責廣泛發現事件與準備證據，不單獨決定整位委員已完成查核；人物必須另經[獨立驗證流程](./independent-verification-workflow.md)與差異裁決，才能標記為 `complete`。

姓名、選區及任職資料仍以名單快照為準。事件研究維持各批蒐集日前五年範圍，且不設定每人事件數量或正負比例。

## 現況與問題

2026-09-27 的共享資料包含 120 位委員、170 個共用事件、291 筆人物參與及 253 個來源。目前分布如下：

| 指標 | 人數 |
| --- | ---: |
| 沒有爭議事件 | 90 |
| 只有一則爭議事件 | 26 |
| 有兩則爭議事件 | 4 |
| 公開人物紀錄不超過兩筆 | 67 |
| 人物紀錄沒有新聞來源 | 73 |

這些數字不能證明每位委員都有漏件，但顯示舊版 `complete` 只代表四個分類與五種來源類型欄位已填寫，不能證明實際搜尋的查詢、結果深度與候選事件處理均已完成。

吳思瑤的宿舍貼文爭議是明確案例：事件於 2026-08-31 發生，早於臺北市批次的 2026-09-19 查閱日，卻未進入候選或正式資料。她的舊紀錄仍被標記為完成，表示驗證器只能檢查已存在資料的一致性，不能發現未被蒐集的事件。

研究缺漏分為三類：

1. **發現失敗**：公開事件沒有進入候選池。
2. **查證未完成**：事件已找到，但缺少第二來源、本人回應或最新程序結果。
3. **發布失敗**：證據已達門檻，但尚未建立共用事件或人物參與關聯。

## 主蒐集流程

### 1. 建立人物搜尋範圍

每次研究先固定：

- `memberId` 與官方姓名。
- 姓名異體、原住民族名、曾用名、英文名及常見誤寫。
- `periodStart`、`periodEnd` 與執行日期。
- 本屆任期、先前公職期間或立委任期前的關係。

任期前事件只收錄與公共職務、參選誠信、重大公益或公共利益直接相關者。

### 2. 執行人物搜尋矩陣

每位委員都必須完成以下來源範圍：

1. 立法院提案、公報、議事錄、質詢影片及具名表決。
2. 行政機關回應、預算、決算、工程與政策執行結果。
3. 法院、檢察署、監察院、審計部、中選會及政治獻金資料。
4. 中央社、公視及其他具採訪制度的新聞媒體。
5. 政黨、本人、工會、公益受贈單位及其他具名利害關係人聲明。

查詢族群至少包含：

- 姓名、姓名加年份、姓名加立委。
- 提案、修法、三讀、質詢、預算、決算、凍結、主決議及政策執行。
- 爭議、澄清、道歉、遭批、失言、調查、告發、起訴、判決、監察院及政治獻金。
- 公益、捐贈、募款、媒合、地方協調及公共服務。

每個查詢至少檢查前 20 個不重複結果。最後 10 個結果仍出現新候選事件時，繼續檢查至 50 個結果，或直到連續 20 個結果沒有新候選事件。搜尋引擎摘要只用於發現，不能作為事件來源。

### 3. 建立候選事件

所有可能符合範圍的發現先建立 `CandidateEvent`，不能直接寫入公開事件。候選狀態如下：

- `discovered`：已發現，尚未完成查證。
- `needs_sources`：缺正式來源或獨立交叉來源。
- `needs_response`：爭議事件尚未找到本人回應，或已記錄確實未取得回應。
- `verified`：已符合發布門檻，等待獨立驗證或裁決。
- `merged`：已併入另一候選或既有事件時間線。
- `rejected`：不符合事實、公共性或可歸屬性要求。
- `out_of_scope`：超出五年、人物範圍或任期前事件收錄界線。

同一法案、預算案、表決或共同事件只建立一次。每位委員的具體角色另以人物關聯記錄，不因共同出席、黨團立場或無具名表決推定個人參與。

### 4. 查證與發布門檻

- 一般事件有直接原始來源即可成立；只有新聞或本人聲明時，需另一個獨立發布者。
- 爭議需正式紀錄，或至少兩個獨立發布者；必須搜尋本人回應及最新後續結果。
- 找不到本人回應時，研究紀錄必須保存使用過的查詢及查閱結果，公開文字明示截至查閱日未取得回應。
- 指控、告發、偵查、起訴、審判、上訴及確定結果分開標示；起訴及未確定判決不得描述為有罪。
- 貢獻須區分主提案、共同提案、連署、質詢、協調、通過及執行結果。
- 公益須區分本人捐贈、號召募款、企業媒合及公帑爭取。
- 同一事件的後續報導更新原時間線，不重複增加事件數。

主流程完成一批後，所有搜尋與候選紀錄須鎖定為不可修改的版本。修正只能建立新版本，舊版本永久保留。

## 研究資料模型

以下模型屬研究工作層，不直接由網站載入。正式發布層繼續使用 `SourceRecord`、`LegislativeEvent`、`MemberParticipation` 與人物背景資料。

### `ResearchSearchRun`

```ts
interface ResearchSearchRun {
  id: string;
  track: 'primary' | 'independent';
  memberId: string;
  query: string;
  queryFamily: string;
  sourceScope: string;
  periodStart: string;
  periodEnd: string;
  searchedAt: string;
  resultCountReviewed: number;
  stopReason: 'exhausted' | 'fewer_results_available' | 'no_new_candidates';
  candidateIds: string[];
  performedBy: string;
  lockedAt: string | null;
  versionId: string;
}
```

### `CandidateEvent`

```ts
type CandidateStatus =
  | 'discovered'
  | 'needs_sources'
  | 'needs_response'
  | 'verified'
  | 'merged'
  | 'rejected'
  | 'out_of_scope';

interface CandidateEvent {
  id: string;
  track: 'primary' | 'independent';
  memberIds: string[];
  provisionalCategory: 'contribution' | 'good_deed' | 'concern' | 'anecdote';
  title: string;
  summary: string;
  occurredAt: string;
  officialId: string | null;
  sourceIds: string[];
  canonicalSourceUrls: string[];
  roleClaims: string[];
  status: CandidateStatus;
  missingEvidence: string[];
  personResponse: string | null;
  processStatus: string;
  resultStatus: string;
  evidenceLevel: string;
  publicationDecision: 'publish' | 'withhold' | 'undecided';
  possibleDuplicateOf: string | null;
  rejectionReason: string | null;
  versionId: string;
}
```

`rejected` 與 `out_of_scope` 必須填寫 `rejectionReason`；`merged` 必須填寫 `possibleDuplicateOf`；`needs_sources` 與 `needs_response` 必須列出 `missingEvidence`。

### `MemberResearchReview`

```ts
type ResearchStatus =
  | 'not_started'
  | 'primary_in_progress'
  | 'awaiting_independent_review'
  | 'independent_in_progress'
  | 'awaiting_adjudication'
  | 'needs_followup'
  | 'complete'
  | 'stale';
```

`complete` 必須由搜尋、比對與裁決紀錄計算，不得直接由人工輸入。只有下列條件全部成立才算完成：

- 主流程搜尋矩陣已完成並鎖定。
- 獨立流程搜尋矩陣已完成並鎖定。
- 所有候選事件已完成比對。
- 所有實質差異已裁決。
- 沒有未處理的 `needs_sources` 或 `needs_response`。
- 正式事件來源已重新開啟，且 `lastVerifiedAt` 已更新。

找不到合格事件仍可完成，但兩套流程都必須留下完整搜尋紀錄。

## 既有資料遷移與全體重查

- 保留所有現有已驗證事件與來源，不因模型更新直接刪除。
- 將 120 位委員的舊 `complete` 狀態一次遷移為 `stale`。
- 先處理 73 位人物紀錄沒有新聞來源者。
- 接著處理 90 位沒有爭議事件者；與前一組重疊者不重複排程。
- 再處理不分區、原住民、新北市等資料稀疏群組。
- 最後完成其餘人物。
- 每位人物都必須分別完成主流程與獨立流程，不能以抽樣取代。

## 覆蓋率與品質報告

覆蓋率報告不再只計算正式事件數，新增：

- 主流程搜尋矩陣完成率。
- 獨立流程搜尋矩陣完成率。
- 候選事件處理率。
- 雙方候選重合率與單方發現率。
- 尚待來源、回應及裁決的數量。
- 各來源類型與年份的覆蓋情形。
- 正式來源距最近複核日的天數。

事件數及正負比例只作描述，不作完成條件或人物評分。

## 實作驗收

- 缺少實際搜尋紀錄的人物不能標記為 `complete`。
- 搜尋紀錄必須能追溯查詢、查閱深度、候選事件及版本。
- 候選事件未完成處理時，人物狀態正確停留在進行中或待補資料。
- 同一共同事件可以關聯多位委員，且每人角色獨立。
- 現有正式事件在遷移後仍能於人物頁顯示。
- 完成狀態、候選差異及資料新鮮度可由報表重現。

## 專案命令

- `npm run data:lock:research -- <track> <batchId> <versionId>`：鎖定版本並寫入內容雜湊。
- `npm run data:compare:research`：比較所有已鎖定的雙軌版本。
- `npm run data:validate:workflow`：驗證矩陣、版本、候選、比對及裁決。
- `npm run data:report:research`：重新計算人物研究狀態與覆蓋率。
- `npm run data:build:research`：驗證後更新狀態、正式共享資料及報告。
