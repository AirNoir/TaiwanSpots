# App Store 行銷素材

依 Apple「App Store asset best practices」製作（2026-11-03）：真實 App 畫面＋一句短標語＋膠囊副標，每張不同底色（天空、金黃、薄荷、蜜桃、淡紫），再放一兩個去背模型（`world/landmark.webp`）壓在手機邊框上，先放最強的功能；不放價格、網址、得獎字樣。

| 資料夾 | 用途 | 尺寸 |
|---|---|---|
| `zh-Hant/iphone-6.9/01–06.jpg` | iPhone 截圖（繁中） | 1320×2868 |
| `zh-Hant/ipad-13/01–06.jpg` | iPad 13 吋截圖（繁中） | 2064×2752 |
| `zh-Hant/creative/universal-16x9.png` | 通用創意素材：同一張可當首圖和搜尋結果（勾「Use header asset in search results」） | 5244×2950 |
| `zh-Hant/creative/header-21x9.png` | 產品頁首圖（iOS 27 起的創意素材） | 3840×1646 |
| `zh-Hant/creative/search-3x2.png` | 搜尋結果圖（iOS 27 起的創意素材） | 3840×2560 |

創意素材一律用 PNG、不帶透明通道：2026-11-03 上傳 21:9 的 JPG 時，App Store Connect 回「副檔名無效」（雖然規格頁寫 JPG 可以）。

截圖順序：首頁地圖 → 解鎖 → 護照 → 景點 → 探索 → 分享。原始畫面在 `store/screenshots/zh-Hant/`。

重做：`templates/` 是 HTML 模板（`shot2.html` 截圖、`hero2.html` 創意素材），`jobs2.py`（截圖文案、底色、模型位置）與 `hero2.json`（創意素材的模型位置）是工作清單，`node render.mjs jobs2.json` 用本機 Chrome（playwright-core，`channel: 'chrome'`）輸出（PNG 或 JPG，都沒有透明通道）。模板裡的路徑是當時的 scratchpad 與 repo 絕對路徑，重跑前改成自己的。
