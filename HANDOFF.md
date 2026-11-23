# V13 會議室預約｜交接

日期：2026-11-23（台北時間）

## 檔案
- index.html：頁面語意結構
- styles.css：清理並整合的介面樣式
- app.js：原生 JavaScript、預約與日曆互動
- assets/hero.jpg：首頁冰島教堂照片
- .github/workflows/pages.yml：GitHub Pages 發佈流程

## 需求
- 首頁 CTA 與日期位於畫面下方偏中的位置，橫向置中，不遮住教堂。
- 首頁圖片的柔和轉場為 3 秒，緩動 cubic-bezier(.22,1,.36,1)。
- Google Workspace 整合資訊按鈕只出現在 schedule 頁面右下方 Footer；其他檢視隱藏。
- Google Workspace **尚未正式串接**，本機儲存不等於雲端同步。
- 模擬事件按授權展示部門；未授權事件只顯示「忙碌」及時段。
- 18 部門：聯訂、人事部、法務部、財務部、企劃部、管理部、資訊部、採購部、都更部、招商部、研發部、廣告部、設計部、總務部、秘書部、驗收部、85大樓、建設部。

## 已保留功能
- 四間會議室排程、日期/月份/年份三級日曆與快速找空房。
- 30、60、90、120 分鐘的空房標示。
- 預約建立、修改、取消、延長 30 分鐘、每日/每週/每月/每年重複預約。
- 衝突檢查、個人預約篩選及本機 localStorage。
- 純前端模擬；沒有伺服器、Google API、身分驗證或跨裝置同步。

## V13 清理
- 移除累積的舊版首頁 Grid/Flex 定位覆寫；主要依 .heroFrame 與 .heroDock 維護。
- 移除已淘汰的 openQuick() 對話框與 findSlots()，使用現有快速找空房 Popover。
- 分離 CSS/JS/背景圖片，避免維護巨型單檔。
- 同步標籤只顯示「僅儲存於本機」，避免假同步狀態。
- Footer 顯示由 setView() 與 integrationFooter.hidden 控制。

## 測試
- Chromium 1440×900、900×900、390×844，無整頁水平溢出或未捕獲 JS 例外。
- 三級日期選擇器、空房搜尋、Google Workspace 顯示範圍已測。
- 建立預約/部門選取/我的預約/取消預約已測。
- `node --check app.js` 通過。
- 尚未實測跨刷新 localStorage、真正授權、真實 Google Calendar 同步。

## 部署與安全
- 儲存庫：hpw6thistle/schedule_meet。
- PR → main，避免 force push；建議啟用 branch protection、2FA，限制 Collaborator Write/Admin。
- GitHub Actions 全域權限 contents:read，僅部署 job 使用 pages:write 與 id-token:write。
- 首次部署需在 Settings → Pages → Build and deployment → Source 選「GitHub Actions」。一般 GITHUB_TOKEN 無法直接建立/啟用新 Pages 站台。
- Pages URL 在成功部署後為 https://hpw6thistle.github.io/schedule_meet/；未經實際驗證前不得稱已上線。

## 後續開發
- 修改現有 CSS 定義，不要再於檔案末端追加覆寫。
- Google Workspace 要透過後端 OAuth、授權與資源日曆管理；禁止在前端放 API key、PAT。
- 為 localStorage 保存、重載、衝突、重複預約、編輯、延長與取消增加自動化 E2E 測試。
