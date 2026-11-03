# App Store 行銷素材

依 Apple「App Store asset best practices」製作（2026-11-03）：真實 App 畫面＋一句短標語，先放最強的功能；不放價格、網址、得獎字樣。

| 資料夾 | 用途 | 尺寸 |
|---|---|---|
| `zh-Hant/iphone-6.9/01–06.jpg` | iPhone 截圖（繁中） | 1320×2868 |
| `zh-Hant/ipad-13/01–06.jpg` | iPad 13 吋截圖（繁中） | 2064×2752 |
| `zh-Hant/creative/header-21x9.jpg` | 產品頁首圖（iOS 27 起的創意素材） | 3840×1646 |
| `zh-Hant/creative/search-3x2.jpg` | 搜尋結果圖（iOS 27 起的創意素材） | 3840×2560 |

截圖順序：首頁地圖 → 解鎖 → 護照 → 景點 → 探索 → 分享。原始畫面在 `store/screenshots/zh-Hant/`。

重做：`templates/` 是 HTML 模板，`jobs.py`（截圖文案與尺寸）與 `hero-jobs.json`（首圖）產生工作清單，`node render.mjs jobs.json` 用本機 Chrome（playwright-core，`channel: 'chrome'`）輸出 JPG（沒有透明通道）。模板裡的路徑是當時的 scratchpad 與 repo 絕對路徑，重跑前改成自己的。
