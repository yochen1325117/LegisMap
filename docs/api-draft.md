# 資料 API 草案（尚未實作）

此文件描述未來可能的資料服務；目前網站只載入本地經核對的立委快照，不會向下列端點發出請求。

| 方法 | 路徑 | 用途 |
| --- | --- | --- |
| GET | `/api/v1/districts?term=11&regionId=63000` | 列出選區及 GeoJSON geometry |
| GET | `/api/v1/districts/:id` | 單一選區、行政區對應與代表 ID |
| GET | `/api/v1/legislators?districtId=...` | 代表名單 |
| GET | `/api/v1/legislators/:id` | 人物基本資料與來源參照 |
| GET | `/api/v1/legislators/:id/events` | 事件時間軸，支援分頁 |
| GET | `/api/v1/sources/:id` | 來源中繼資料與原始網址 |

回應應包含穩定 ID、資料版本、更新時間、來源與審核狀態。選區 geometry 使用 WGS84 經緯度 GeoJSON（`Polygon` 或 `MultiPolygon`）；行政區節點使用 Taiwan-Atlas 的區域 ID。事件的來源需可追溯，AI 生成摘要需保留標記與人工審核狀態。正式上線前須定義政治資料的來源、授權、更新頻率與更正機制。
