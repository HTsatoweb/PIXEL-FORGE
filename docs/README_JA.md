# PIXEL FORGE STUDIO v47.0

## 起動

1. ZIPを新しいフォルダーへ展開します。
2. Windowsは `run_local_server.bat`、macOS／Linuxは `run_local_server.sh` を実行します。
3. 表示されたローカルURLをPCで開きます。スマホでは同じWi-Fi上のPCのLAN IPと同じポートを開きます。
4. IndexedDB、Service Worker、ファイル入出力を安定して使うため、`file://`直開きではなくローカルサーバー経由で起動してください。

## v47.0の修正

- PCで設定パネルを閉じた直後、キャンバスのサイズ変更をきっかけにパネルが自動で再表示される問題を修正しました。閉じた状態をリサイズ後も保持します。
- スマホの設定パネルを閉じる操作を、別の×ボタンを合成クリックする方式から、共通の状態更新を直接呼ぶ方式へ変更しました。
- 検索・一括展開／折りたたみ・閉じるボタンの配置を整理し、狭い画面でも閉じるボタンを確保します。
- スマホのカテゴリーナビと固定ツールバーのsticky位置が重なる問題を修正しました。
- `PF_EDITOR_ACTIONS.panel()`をPCでも正しく開閉できるように修正しました。
- `.pforge`の`PIXEL_FORGE_PROJECT` version 5、IndexedDBデータベース`PixelForgeDB`／schema version 3は維持します。

## 既存機能について

カラー検索、カラーパレット、ブラシ設定、検索、全て開く、全て閉じる、各設定パネル、描画エンジン、PSD対応、レイヤー、アニメーション、保存・読込は削除していません。

## 文書

- `START_HERE_JA.md`: 導入と既存作品の引き継ぎ
- `CHANGELOG_v47_JA.md`: 今回の修正内容
- `TEST_RESULTS_v47_JA.md`: 実施した検査と未確認項目
- `FILE_MANIFEST_v47.json`: ZIP内ファイル一覧・サイズ・SHA-256

過去バージョンの変更履歴・マニフェストは履歴資料として残しています。
