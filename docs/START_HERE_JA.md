# PIXEL FORGE STUDIO v46.0 はじめに

## 起動

1. ZIPを新しいフォルダーへ展開します。
2. Windowsは `run_local_server.bat`、macOS/Linuxは `run_local_server.sh` を実行します。
3. 表示されたローカルURLをPCで開きます。スマホは同じWi-Fi上でPCのLAN IPと同じポートを開きます。
4. IndexedDB、Service Worker、ファイル読込・保存を安定して使うため、`file://` 直開きではなくローカルサーバー経由で起動してください。

## v46.0の重要な修正

- 作品は一時キャンバスに復元し、全レイヤー・参照画像・全アニメーションフレームの画像検証が成功してから切り替えます。読込失敗時は現在の作品を保持します。
- PC・スマホのダイアログ、設定パネル、メニューを共通の表示順で閉じます。
- スマホ設定パネルを背面に押し下げていた旧`.workspace.panel-open`のz-index上書きを修正しました。
- VisualViewportに合わせてダイアログの高さと位置を調整します。
- 必須の描画エンジンが読み込めない場合は、起動進捗にエラーと再読み込み操作を表示します。
- 保存時の巨大な作品データの再読込を廃止し、非同期画像エンコードを優先します。
- `.pforge`とIndexedDBの`PIXEL_FORGE_PROJECT` version 5、データベース名`PixelForgeDB`／schema version 3を維持します。

## 既存作品の引き継ぎ

同じブラウザー・同じオリジン・同じポートで開けば、従来のIndexedDB作品を引き継げます。フォルダーやURL／ポートを変える場合、元の環境でホーム画面のバックアップ機能を使って`.pfarchive`または`.pforge`を書き出してから、新環境で復元してください。

## ファイル構成

`index.html`と`help.html`はルート直下です。スクリプトは`js/`、スタイルは`css/`、画像は`assets/images/`、説明・検査記録は`docs/`にあります。`sw.js`はルートスコープを維持するためルート直下に置いてあります。

## 検査記録

- `CHANGELOG_v46_JA.md`: 今回の修正内容と互換性方針
- `TEST_RESULTS_v46_JA.md`: 実施した検査と、環境上未確認の項目
- `FILE_MANIFEST_v46.json`: ZIP内ファイル一覧・サイズ・SHA-256
- `LEGACY_FILE_GUIDE_v46_JA.md`: 旧版ファイルの役割

旧版の変更履歴・マニフェストは履歴資料として残しています。
