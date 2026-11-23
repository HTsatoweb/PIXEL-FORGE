# PIXEL FORGE STUDIO v46.0

## 起動

1. ZIPを新しいフォルダーへ展開します。
2. Windowsは`run_local_server.bat`、macOS／Linuxは`run_local_server.sh`を実行します。
3. 表示されたローカルURLを開きます。スマホでは同じWi-Fi上のPCのLAN IPとポートを使用します。
4. IndexedDB、Service Worker、ファイル入出力を安定して使うため、`file://`直開きではなくローカルサーバー経由で起動してください。

## 作品データの保護

- `.pforge`の`PIXEL_FORGE_PROJECT` version 5と`PixelForgeDB` schema version 3を維持します。
- 読込時は画像を一時領域に復元し、全て成功してから現行作品を切り替えます。失敗した場合は読み込み前の作品を保持します。
- 破損した画像や端末の安全容量を超えるデータは、現行作品を置き換える前に拒否します。
- 保存は非同期Canvasエンコードを優先します。巨大な作品を同期`toDataURL()`へフォールバックして画面を長時間止めることを避けます。

## 今回の修正

- PC／スマホのウィンドウを共通レイヤーで管理し、最前面から閉じます。
- スマホ設定パネルと旧CSSのz-index競合を修正しました。
- VisualViewportによるダイアログ位置・高さの調整を有効にしました。
- 必須`app.js`が読み込めない場合の起動エラー・再読み込み表示を追加しました。
- 保存後の巨大な作品レコード再取得を削減しました。

## 文書

- `START_HERE_JA.md`: 導入と既存作品の引き継ぎ
- `CHANGELOG_v46_JA.md`: 修正内容・互換性方針
- `TEST_RESULTS_v46_JA.md`: 検査結果と未確認項目
- `FILE_MANIFEST_v46.json`: ファイル一覧・サイズ・SHA-256（マニフェスト自身は再帰ハッシュを避けるため対象外）
- `LEGACY_FILE_GUIDE_v46_JA.md`: 旧版ファイルの役割
