# 廣角／透視檢查與三個優先預覽：2026-10-19

依上次交接，先處理中正紀念堂、勝興車站、士林夜市。共生成 6 張（第一輪 3 張未通過，重新取景各 1 張），以內建 imagegen 生成原生 1254² PNG，保留每次 prompt 和舊版。最新選版：

| 景點 | 新預覽 | 這輪自我檢查 | 仍待確認 |
| --- | --- | --- | --- |
| 中正紀念堂 | review-v5.png | 四邊小圓角方形支座；直立建築與單一地坪透視，保留真實牆體收分及屋簷曲線 | 89 階逐級數量、平台尺寸、植栽配置 |
| 勝興車站 | review-v4.png | 廣角近物不再照搬放大；金屬浪板屋頂；方形支座，樹冠／屋簷收在範圍內 | 精確軌道數、月台與站房側向關係、鄰近街屋；可用站外街景仍未取得 |
| 士林夜市 | review-v4.png | 北藝中心幾何與街道透視重建；去掉越界軌道，只呈現範圍內的站入口段；方形外框無凹口 | 劍潭完整站體屋頂、現況店家、路寬與距離、各建物尺度 |

這是**模型的多角度透視重建**，不是把來源照片做了精確去畸變。原照完全保留，沒有缺少鏡頭參數卻強行套一個全景／單應轉換。各景點 `reference/lens-review-20261019.json` 記錄實際檢查與限制。原照中真實的屋簷曲線、牆體收分及北藝球體斜支柱不能被誤當成鏡頭問題而拉直。

## 實際來源發現

- 中正紀念堂舊 `real-photo.jpg` 與 Google 全景截圖是同一個角度，不能當兩個獨立視角。補入 [Shubham2712 的 2015 年獨立斜向照片](https://commons.wikimedia.org/wiki/File:Chiang_Kai-shek_memorial_hall.jpg)（CC BY-SA 4.0，27mm 全片幅等效），並搭配既有衛星平面核對。新照片仍是廣角仰拍，不能稱為無畸變遠景照。
- 勝興原照 EXIF：Sony ILCE-7RM2、FE 24–70mm F4 ZA OSS，24mm／全片幅等效 24mm，2019-03-26。另補 [文化部獨立站房照片](https://tcmb.culture.tw/zh-tw/detail?id=19990416000001&indexCode=BOCH_CountryCulture_11)；該資料與原照確認屋面為金屬浪板，修正舊 blueprint 的瓦屋頂描述。
- 士林使用既有北藝中心外部全景、衛星、劍潭入口照片交叉比對；全景的視窗投影不直接等於建築真實形狀。沒有取得完整鏡頭標定資料，精確逆鏡頭校正維持 pending。沒有因生成較好看就核准其地理。

## 預覽與接續

`docs/asset-review-selections.json` 選上面三張，其餘 42 個既有預覽選版不變。`scripts/build-diorama-prompt.mjs` 已加入獨立視角與鏡頭／投影檢查要求，改用無背景板的淡水 v4 底座參考，明確禁止削平角與凹口。每張完整 prompt 在 collection 同名 `-prompt.txt`；來源寫進 sources.json 和 blueprint.references。

比較頁：`http://127.0.0.1:8881/docs/asset-comparison.html#cks-memorial`，重新整理後可切換三張新版、舊版與新增的實景角度。所有新版本仍待使用者確認，blueprint geographic／identity 維持 pending。style／collection 的 pass 僅表示本輪目視自我檢查。

正式 App 的 master/day/thumbnail/token/WebP 未改，也未修改 src/。其餘景點尚未逐張完成本次鏡頭檢查，不宣稱全系列校正完成。
