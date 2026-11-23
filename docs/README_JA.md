# PIXEL FORGE STUDIO v34.0

デジタルペイントスタジオ。HTMLはルートに残し、JS/CSS/画像/Markdownを用途別フォルダに整理しています。

- 起動: `run_local_server.bat` または `run_local_server.sh`
- メイン: `index.html`
- ヘルプ: `help.html`
- JavaScript: `js/`
- CSS: `css/`
- 画像: `assets/images/`
- Markdown資料: `docs/`
- Service Worker: `sw.js`（ルートスコープ維持のためルートに配置）
- データベース: `PixelForgeDB` version 3（既存スキーマを維持）
- ブラシ設定: 画材ごとの自動保存、書き出し・読み込み、別画材への設定コピー。画材プロファイルは84項目のフォーム状態を記録。
- 虹色: 曲線方向、横方向、縦方向、開始位相、逆方向、下色拾い
- 指先混色: 選択レイヤーのみ／表示レイヤー全体

重要な作品は `.pforge` と `.pfarchive` の両方でバックアップすることを推奨します。作品のブラウザ保存領域はオリジン（スキーム・ホスト・ポート）ごとに分かれます。
