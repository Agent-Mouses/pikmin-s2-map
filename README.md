# Pikmin Bloom S2 Cell Map Tool

🌱 S2 Cell 地圖視覺化工具，用於皮克敏 Bloom 刷盆策略規劃。

## 功能

- **S2 Cell 網格覆蓋** — 在地圖上顯示 S2 Cell 格線
- **Level 12-20 切換** — 滑桿 + 快捷按鈕切換 Cell Level
- **GPS 定位** — 顯示目前位置及所在格子
- **格子點擊資訊** — 點擊格子顯示 Cell ID、座標
- **行動裝置友善** — 觸控操作、響應式設計

## 使用方式

直接開啟 `index.html` 或部署到 GitHub Pages。

### 本地測試

```bash
# 任何靜態伺服器皆可
python3 -m http.server 8080
# 然後開啟 http://localhost:8080
```

## 技術

- Leaflet.js — 地圖底圖 (OpenStreetMap)
- 自寫 S2 Cell 幾何計算 — 基於 jonatkins/s2-geometry-javascript
- 純前端靜態網站，無需後端

## S2 Cell 刷盆小知識

- 皮克敏 Bloom 使用 **Level 17** 的 S2 Cell（約 150m × 150m）
- 每格有固定掉落物，有 CD 冷卻時間
- 約 1,000～3,000 步觸發一盆掉落
- 每日自然生成上限 25 盆

## License

MIT
