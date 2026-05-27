# Google Apps Script — assets API

## 1. 建立試算表

1. 新增 Google 試算表。
2. 建立分頁 **`assets`**（名稱需完全一致）。
3. 第一列標題（或由腳本自動建立）：

   | id | name | type | status | createdAt |
   |----|------|------|--------|-----------|

4. 第二列起留空即可（職員從前端新增後會寫入）。

`type` 僅允許：`venue`（空間）、`equipment`（設備）  
`status` 預設：`可租借`

## 2. 安裝腳本

1. 試算表：**擴充功能 → Apps Script**。
2. 刪除預設 `Code.gs` 內容，貼上本資料夾的 `Code.gs`。
3. 選函式 **`setupAssetsSheet`** → **執行**（授權試算表存取）。
4. 確認試算表出現 `assets` 分頁與標題列。

## 3. 部署 Web App

1. **部署 → 新增部署作業**。
2. 類型：**網頁應用程式**。
3. 執行身分：**我**。
4. 存取權：**任何人**（前端才能 fetch）。
5. 部署後複製 URL，格式類似：  
   `https://script.google.com/macros/s/AKfycbxxxx/exec`

## 4. 連接前端

專案根目錄建立 `.env`：

```env
VITE_SHEETS_API_URL=https://script.google.com/macros/s/你的部署ID/exec
```

本機：

```bash
npm run dev
```

GitHub Pages：在 repo Secrets 新增同名 `VITE_SHEETS_API_URL`。

## 5. API 測試

在瀏覽器開啟（應回傳 `[]` 或既有資料）：

```
https://script.google.com/macros/s/你的部署ID/exec?path=assets
```

新增（可用 curl 或 Postman）：

```bash
curl -X POST "https://script.google.com/macros/s/你的部署ID/exec?path=assets" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"羽球場 A\",\"type\":\"venue\"}"
```

回應範例：`{"assetId":"v-1710000000000-123"}`

## 6. 前端對應

| 操作 | 前端方法 |
|------|----------|
| 讀取空間/設備 | `GET ?path=assets` → `sheetsApi.fetchAssets()` |
| 職員新增 | `POST ?path=assets` → `sheetsApi.createAsset()` |

學生主畫面、職員管理頁載入時會呼叫 `loadAssets()` 同步試算表資料。
