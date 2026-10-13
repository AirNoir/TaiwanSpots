# 象山・山城之間

獨立的瀏覽器 3D 風格審查原型。所有模型均為實體幾何，可旋轉、縮放；沒有以平面照片冒充 3D。使用本地固定版本 Three.js 0.160.1（MIT），不需外部 CDN。

## 開啟

在專案根目錄執行：

```sh
python3 -m http.server 8880 --bind 127.0.0.1 --directory docs/xiangshan-3d
```

開啟 http://127.0.0.1:8880/ 。滑鼠拖曳旋轉、滾輪縮放；觸控單指旋轉、雙指縮放。也可用畫面按鈕，或聚焦模型後以方向鍵、+、-、Home 操作。

## 實作

- 99 棟建築，包含獨立建模的台北 101、台北南山廣場與右側遠雄金融中心簡化輪廓；其餘為有窗格、屋頂設備與部分陽台的藝術化街廓。
- 101 八段塔身、斜面窗格、分節飾環、底層立面及尖塔；南山廣場切角塔身、垂直肋條、分開的冠部和商場裙樓。
- 六個不同岩體，連續三維程序砂岩材質、微小凹凸、色差、裂隙與苔蘚色調。不是照片紋理或掃描資產。
- 25 層踏階向城市方向下降，兩個登山人物的腳底使用所在踏面高度。
- 不規則地形板塊、土壤切面、完整底面、枝幹、分層樹冠、蕨類、碎石、草與落葉。
- 重複物件使用 InstancedMesh。場景静止時不持續重繪，靜態陰影完成後快取；像素比例上限 1.75。
- 提供收藏、岩石、城市、背面四個視角；DOM data 屬性提供檢查用的視角和繪製統計。

## 參考

1. Mliu92，View from Xiangshan，CC BY-SA 4.0： https://commons.wikimedia.org/wiki/File:View_from_Xiangshan.jpg
2. UponArriving，步道與岩石近景： https://www.uponarriving.com/elephant-mountain-taipei/
3. 臺北市大地工程處，步道與巨石側面： https://www.geo.gov.taipei/News_Content.aspx?n=23285747C0511EC4&s=40D73EEE2FD289DB&sms=72544237BBE4C5F6
4. 三菱地所設計，南山廣場竣工照片及設計說明： https://www.mjd.co.jp/en/projects/27998/

照片僅供人工觀察，未嵌入此原型的材質。前三張參考已保留於 assets/spots/xiangshan/reference/，沿用 sources.json。

## 自我檢查與限制

- 已在桌面瀏覽器與 390 × 844 手機尺寸檢查主視角，並查看城市、岩石與背面。
- 已驗證拖曳改變水平/俯視角、放大改變距離、重設恢復初始狀態。瀏覽器無 JavaScript error。
- node --check、專案 npm run lint、npx tsc --noEmit 通過。
- 不是測繪重建：城市距離與景物比例已壓縮；完整六石位置、岩石背面與普通街廓仍為藝術推演，不能宣称每個建築位置均符合實景。
- 目前未完成真實 iPhone/Android 裝置的 GPU、記憶體、續航及雙指手勢實測。瀏覽器尺寸檢查不等於手機硬體效能驗收。
- 風格與可售品質仍待使用者審查；不可把本原型視為已完成上架驗收的付費資產。尚未整合 Expo，也未批次製作其他景點。
