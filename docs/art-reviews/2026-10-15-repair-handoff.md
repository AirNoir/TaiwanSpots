# 修圖交接：2026-10-15

本批針對匯入的 22 筆 adjust，另加東石的底座註記，共 23 個景點產出修訂預覽（27 張生成圖，含 4 張退回重試）。全部使用內建 imagegen，保留原生 1254 × 1254 PNG；每版都有同名 `-prompt.txt`。新版本均待使用者確認，沒有自動核准。

## 回家接手

1. 更新 main：`git pull --ff-only`。
2. 在專案根目錄執行 `python3 -m http.server 8881 --bind 127.0.0.1`。
3. 開啟 `http://127.0.0.1:8881/docs/asset-comparison.html`，重新整理以載入新選版。
4. 逐筆舊版→新版對照、註記與自我檢查見 [repair-progress.json](repair-progress.json)。選圖由 [asset-review-selections.json](../asset-review-selections.json) 決定。完整 prompt 在各景點 collection 資料夾與 [cute-diorama-prompts.json](../cute-diorama-prompts.json)。

先前匯入的 review 原檔與 merged.json 均保留，未把舊版的審查結果套成新版核准。比較頁筆記存在各台瀏覽器 localStorage，不會隨 git 搬到另一台；要帶走新筆記請另外匯出 JSON。

## 明確未通過，優先接續

- **使用者最新補充：先處理參考照片的廣角／魚眼／全景投影與透視變形，再修圖。** 不可直接把邊緣拉伸、建築傾斜、近大遠小的誇張比例搬進模型。用多角度照片與鳥瞰核對真實形體，回到系列一致的 45° 模型視角；鏡頭資料不足就保留限制，不能假稱精確校正。此項已記錄，尚未開始校正，留待回家接續。方法及原圖保留要求見 [art-pipeline.md](../art-pipeline.md)。
- **中正紀念堂 review-v3**：重試後前右側底座仍有多一段削角，未達四邊小圓角方形。blueprint style/collection 記為 fail。下一次以真正四角底座重建，不沿用現有多邊形外框。
- **勝興車站 review-v2**：建築與樹冠已縮進範圍，但前角新出現削平邊，方形底座 QA 未通過。style/collection 記為 fail。
- **士林夜市 review-v2**：改為北藝中心／劍潭站／南側夜市入口取景；右方軌道末端仍超出底座，邊框出現凹口。style/collection 記為 fail。須先讓軌道、柱腳全部收進四邊底座，再核對道路及建築尺度。

## 其他需人工確認的限制

- 奮起湖新版平台與軌道呈現較一致的承托面，但使用者指出的水平／下凹觀感仍需再看。
- 貓空增加底座內的模型回轉輪，解決懸空纜線末端；這是展示模型的簡化機構，不代表該地真的有這座設備。車站外觀仍未完整核對。
- 日月潭拉魯島周圍的浮動植栽有實景照片依據；它不是外框。新底座的觀感仍待人工確認。
- 故宮牌樓柱數／開口等既有地理疑點、各場景的藝術化距離壓縮，沒有因本次底座修訂就獲得地理核准。
- 其餘新圖也全部待使用者逐張接受；生成成功不等於所有細節通過驗收。

## 新增士林證據

`assets/spots/shilin-night-market/reference/sources.json` 記錄：北藝中心外部 360°（張永翔，2022-07）、Google 衛星觀察（影像拍攝日未顯示）、劍潭入口（Andy Yang，2025-05）及南側商圈照片（2018 發布，歷史街景，不用來判定目前店招）。官方交通頁另確認北藝中心與劍潭站步行關係。原慈諴宮照片保留作歷史版本來源，不當作新取景主參考。完整站體屋頂、店家精確位置與道路間距仍待確認。

## 資產與驗證

已接受的 21 個景點未重產。正式 master/day/thumbnail/world 及 WebP 瘦身資產均未套用新預覽，沒有新增 App 包體圖片；本批未修改 src/。

已執行 lint、`npx tsc --noEmit`、`npm run assets:check`、`npm run spots:check`；資產檢查 159 景點、0 errors、517 個既有缺正式圖／token 等警告。這些技術檢查不會驗證照片地理或底座造型。
