# Islandia 美術製作流程（Diorama → Token → Taiwan World）

對應 *Islandia Diorama & Taiwan World Visual System Spec v0.2*。這份文件說明 repo 裡的檔案、指令與 QA 怎麼對上規格。

## 資料夾結構

```text
assets/spots/
  blueprint.schema.json          Scene Blueprint 格式（§5）
  MASTER_STYLE_REFERENCE.png     可愛樹脂模型風格的台北 101 母版
  <spot-id>/
    blueprint.json               景點製作 brief（不會打包進 App）
    reference/                   Aerial / Ground / Map / Representative 參考圖（不打包）
    collection/                  Asset A — Collection Diorama
      master.png                 原生 1254² 生成原始檔（不被 App 引用）
      day.webp|png               1024² runtime
      sunset.webp / night.webp   選用 variant
      thumbnail.png              512² 給 Passport grid
    world/                       Asset B — World Token
      landmark.webp|png          512–1024 透明背景，只留 Hero 元素
      .final                     存在 = 手工定稿，extract script 不會覆蓋
```

App 只透過 `src/data/spotAssets.ts` 取圖。實際的 `require()` 對照表 `src/data/spotAssets.generated.ts` 由腳本產生，**不要手改**。

## 指令

| 指令 | 用途 |
| --- | --- |
| `npm run assets:prompt -- <id>` | 由 blueprint + Master Art Direction 組出 Diorama 生成 prompt |
| `npm run assets:prompt -- <id> --token` | 組出 World Token 生成 prompt |
| `npm run assets:tokens [-- <id>…]` | 從 `collection/day` 去背裁切出暫用 token（跳過有 `.final` 的） |
| `npm run assets:registry` | 掃描資料夾、重產 `spotAssets.generated.ts`（**新增或改名任何圖之後都要跑**） |
| `npm run assets:export` | 用 Pillow 輸出 1024² 收藏 WebP、512² 縮圖及透明圖標 WebP；PNG 原檔保留 |
| `npm run assets:gallery` | 建立 `docs/asset-gallery.html`，並排檢視收藏圖、地圖圖標和來源 |
| `npm run assets:check` | 檢查 blueprint 格式、缺圖、尺寸是否達標；有 error 時 exit 1 |

## 流程（§21）對照

1. **Select Spot**：在 `src/data/spots.ts` 新增，設定 `worldTier`（anchor / regional / local）與 `production`（hero / standard）。
2. **Collect References**：放進 `<id>/reference/`，並把檔名填進 blueprint 的 `references`。
   新景點至少使用兩張不同角度的實景照片；以多張照片交叉確認階梯升降、地形高低、主體輪廓與遠近關係。可愛風格只能簡化材質和細節，不能反轉坡向或改造場景。無法確認的配置保留待確認，不以生成結果當作證據。
3. **Analyze Geography → 4. Scene Blueprint**：補完 `blueprint.json`。標有 `verify:` 的項目要拿參考圖確認。收到來源後把 `status` 改成 `references-collected`；完整人工審核才改成 `approved`。
5. **Representative Crop / 6. Hero Scale**：blueprint 的 `crop`、`heroScale`。本系列使用 1，保留地標輪廓，再柔化細節。
7. **Generate Master Diorama**：`assets:prompt` 產出的文字，**加上** `MASTER_STYLE_REFERENCE.png` 與參考圖一起送出。只用文字無法維持一致性。
8. **Geographic QA / 9. Style QA**：依下方 checklist 檢查，結果填到 blueprint 的 `qa`。通過後 `status: approved`。
10. **Collection Assets**：輸出 `master.png`、`day`、`thumbnail`（及選用的 sunset、night）。
11. **World Token**：用 `assets:prompt -- <id> --token` 做手工 token，放到 `world/landmark.*`，並 `touch world/.final`。
12. **Add to Taiwan World**：`npm run assets:registry && npm run assets:check`。

## QA Checklist（§16）

**Geographic**
- [ ] Landmark 位置合理
- [ ] 海岸 / 山 / 河 / 湖的相對關係正確
- [ ] 沒有 `doNotInvent` 裡的任何東西，也沒有其他不存在的建築
- [ ] 道路與步道沒有嚴重錯誤

**Identity**
- [ ] 3 秒內認得出是哪裡
- [ ] Hero 夠清楚，silhouette 正確（對照 `lockedIdentity`）

**Style**
- [ ] Camera、Material、Lighting、Base、Saturation 和 MASTER_STYLE_REFERENCE 一致

**Collection**
- [ ] 縮到 512px 仍可辨識
- [ ] 放進 Passport grid 不會過度複雜
- [ ] 和其他 Collection 放在一起像同一系列

## 目前狀態（2026-10-07）

- 24 個景點各自使用真實照片作為參考，產出可愛樹脂／黏土收藏模型；保留主要地形、建築輪廓與景點辨識特徵。
- 收藏圖保留生成器原生 1254² master，輸出 1024² day 和 512² thumbnail；不把放大圖片標成高解析母版。
- 地圖圖標獨立生成透明背景的主要地標，輸出 512²，經檢視後以 `.final` 保護。
- 參考來源記錄在各景點 `reference/sources.json` 和 `docs/photo-reference-manifest.json`；照片只作為生成參考，不由 App 引用。
- `docs/cute-diorama-prompts.json` 記錄收藏圖提示詞，`docs/cute-token-prompts.json` 記錄地圖圖標提示詞。
- 24 份 blueprint 為 `references-collected`；完整人工地理審核仍保留待確認狀態。圖像為藝術化微縮場景，並非測繪模型。
- 母版使用可愛版台北 101；奶油色底座、柔和光線、圓潤植栽與簡化材質形成一致風格。

## 景點審查最新系列規格（2026-10-15）

使用者最新指示覆寫背景卡版本：所有景點移除背景板、卡片、支架與夾具。只呈現選定範圍的真實前、中景；遠方山海或天際線若不在取景內就省略，不變成模型後方的牆，也不移到主地標旁。基座之外統一奶油色攝影棚背景。

45° 向下斜上方三分之四鳥瞰，從前方一角觀看，兩個側面在對稱視角下等長。全系列必須使用真正等邊方形、淺厚度象牙色基座，四條長直邊、四個直角轉折，圓角半徑約邊長 6%。天然湖岸、海岸、山坡只能落在底座內，不得改變外框。厚度、邊框與圓角參考使用者已接受的淡水 review-v4.png（無背景卡）。底座修訂仍須逐張目視檢查，不能因 prompt 寫了 square 就視為通過。完整底座與主體入鏡，留白 10–15%。

底座頂面水平、鏡頭無滾轉；建築垂直線直立，平地、建築水平線與底座使用同一組透視。保留實際斜坡、彎路與原本斜向的建築平面，不為了畫面對齊扭曲真實地理。

場景占地必須全部落在方形基座內，包含建築、地形、岩石和樹冠，不得在後緣偷接另一塊城市或森林。保留可看清的連續象牙色外框與內側緩衝；若內容超出就縮小整個場景的共同尺度，不能只裁掉外圍物件或讓地形溢出。地標向上立起的正常高度不等於占地越界，但每個物件的根部與底座連接必须可信。

Q 版化是輕度圓潤比例，擬真的是材質與環境：石材、屋瓦、木紋、玻璃、磨損與接觸陰影。遊客與天然地標需使用一致微縮尺度，尤其女王頭不得誇大成巨岩塔。實景看不清楚的尺寸標 pending，不宣稱測量精度。柔和自然光、適度移軸感；主體清楚，不用模糊掩飾細節。

色調以柔和自然為準，鮮豔度比先前預覽略低約 12%，保留明暗、白色基座與材質細節，不增加灰霧或降低曝光。比較頁預設採 docs/asset-preview-color.json 的 88% 顯示調色，提供 70–100% 微調及原色對照；只作用於模型與模型縮圖，實景照片不調色。此階段為顯示預覽，原始 PNG、正式 App 資產與幾何均未更動；輸出調色圖片須在正式套用時另行處理。

正式輸出若已將相同調色烘焙進圖片，須同步將比較頁對應的顯示調色還原 100%，避免重複減色。

`npm run assets:prompt -- <id>` 使用此規格。逐張的完整提示詞保存在 collection/review-vN-prompt.txt 與 docs/cute-diorama-prompts.json。prompt 更新不等於圖片已通過 QA；舊 master/day/token 仍是正式 App 資產，預覽須經使用者逐張確認後再套用。

新增景點可先交付審查預覽：來源收集後設為 `references-collected`，將原生 `review-vN.png` 加入 `docs/asset-review-selections.json`，更新比較頁。此階段不產生 day、thumbnail 或 token，也不註冊進 App。`assets:check` 對已明確選定且寬高均達 1024px 的審查圖，將缺 day 列為「待核准」警告；沒有有效預覽的非 draft 景點仍報錯，`approved` 景點也仍必須有正式 day。

## App 圖片瘦身（2026-10-15）

`docs/asset-runtime-spec.json` 定義收藏大圖 1024px／WebP 品質 90、縮圖 512px／品質 88、地圖圖標 512px／無損 WebP。縮圖保留 512px，支援 160pt 的 3 倍螢幕卡片與 iOS 小工具。所有衍生圖內建於 App，沒有新增網路下載流程，也不烘焙比較頁的 88% 顯示調色。

第一次瘦身預設以現有 `day.png`、`thumbnail.png` 為來源；沒有 day 時才使用 master，完全不讀取 review-vN 作為正式來源。原始 PNG、參考照片、review 版本及 `.final` 均保留。明確要正式套用新的 master 時使用 `npm run assets:export -- --source masters`；來源模式會記錄在報告中，後續直接 export 會沿用，避免下次壓縮切回舊 day。需要明確回到 PNG runtime 來源可用 `--source runtime`。

輸出後執行 `npm run assets:registry`。登錄與驗證共用相同的檔案優先序，先選 WebP，避免驗證了 PNG、App 卻讀另一個檔案。只被登錄與程式引用的正式資產會被 Metro 打包；母版、參考照片和歷史 review 不會因為放在 assets 目錄就一起打包。

Python 工具依賴 Pillow，版本見 `scripts/requirements-art.txt`。可在自己的 Python 虛擬環境安裝後，以 `ISLANDIA_PYTHON=/path/to/venv/bin/python npm run assets:export` 執行。測試：`PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s scripts -p test_runtime_assets.py`。

容量／來源 SHA-256／輸出尺寸／編碼參數記錄於 `docs/runtime-asset-report.json`，驗證結果見 `docs/runtime-asset-validation.json`。本次 74 張正式圖片由 58.34 MB 降為 11.06 MB（減少 81.05%）；這是圖片檔案總量，不是 IPA/APK 或安裝後大小。[畫質比較](runtime-image-comparison.html) 可放大檢查。

iOS 與 Android Metro/Hermes 匯出通過，asset map 確認只有 74 張景點 WebP，沒有 PNG／master／reference／review。另在既有 iPhone 16 Pro（iOS 18.3）模擬器以 UIKit `UIImage(data:)` 解碼 74 張 WebP 與小工具的 PNG 檔名複製檔，75 項皆通過。檢查程式為 `scripts/check-runtime-webp.m`。這不代表已完成實體裝置或整個 App UI 驗收。
