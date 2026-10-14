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
| `npm run assets:export` | 用 macOS sips 從原始檔輸出 1024² 收藏圖和 512² 縮圖 |
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

## 景點審查最新系列規格（2026-10-14）

以使用者最新指示覆寫舊風格：45° 向下的斜上方三分之四鳥瞰，從基座前方一角觀看，清楚看到兩個側面。全系列用等邊方形、圓角、淺厚度的象牙色基座；透視造成的菱形外觀不等於長方形。鏡頭拉遠，完整基座與主體入鏡，四周留白 10–15%。

保留 Q 版比例，擬真的是材質與環境關係：石材、屋瓦、木紋、玻璃、磨損與接觸陰影。使用柔和移軸式景深，不能把近景做成手繪或普通風景照片。

有遠方山海／城市時，以獨立實體背景卡呈現。有遠景的背景卡統一使用兩根短象牙色支架與小型黃銅夾具，夾住卡片下緣兩角；支架高約卡片高度 5–7%，固定於同一基座後緣。卡片抬高，未遮擋的下緣、厚度、夾口、奶油色空隙及投影均須可見。模型水面在基座內的象牙色後緣收口，與卡片上的水隔開，不可無縫連成一體。近景主地標及附近地形仍為立體模型；不要在沒有遠景的取景中硬加圖卡。卡片內容按真實地理輪廓模擬，不將遙遠海水移到山頂建築旁。

`npm run assets:prompt -- <id>` 和 `docs/cute-diorama-prompts.json` 已更新；舊提示詞保留在 `docs/cute-diorama-prompts.legacy.json`。這是出圖規格更新，並不代表全部舊圖片已重製。

背景卡夾具固定為一對相同的霧面象牙色短圓柱支架＋緞面黃銅圓角長方形彈簧夾，上下排列的兩個圓形固定點（以淡水 review-v3.png 為夾具造型唯一參考）、可見夾口；不得混用夾具造型。背板垂直於底座、平行底座後緣，上下長邊與對應底座前後邊使用同一透視消失點，不能斜插或滾轉。卡面水的水平線與整體河岸基準線在卡面座標中保持水平，透視方向跟隨卡片長邊；山稜線依實景保留起伏。

底座驗收必須看到四條直邊與四個直角轉折，圓角軟化程度、基座厚度與邊框寬度以淡水 review-v3.png 為共同產品樣板（圓角半徑約邊長 6%，四邊仍以直邊為主）；天然湖岸只能在底座內，不可用湖岸形状當作展示底座外輪廓。對稱斜上方主視角下兩個可見側面應等長；不能只在 prompt 寫 square 就宣稱驗收通過。

基座與背景卡的共用產品樣板改以 assets/spots/tamsui/collection/review-v3.png 為準：同樣的象牙色厚度、邊框、圓角、寬版背景卡比例與夾具尺寸；只替換景點內容。背景卡山海圖維持自然照片感與材質，不新增手繪山稜或裝飾性霧帶。
