# PIXEL FORGE STUDIO v11.0 検査結果

検査日：2026-11-17

## 自動静的検査
`python verify_v11.py` を実行。

- 必須ファイル：12ファイルを確認
- HTML ID：263個、重複なし
- v10の基準ID一覧260個と照合し、削除0個（v11で3個を追加）
- `index.html` のローカル参照：9件、参照切れなし
- `help.html` のローカルリンク：5件、参照切れなし
- Service Workerのキャッシュ対象：13件、ファイル参照切れなし
- Web App Manifest：JSONとして読み込み成功、v11名を確認
- 強化・維持チェック一覧：121項目
- 使い方サイト：主要セクション13個、ローカル参照切れなし
- 起動サーバー確認：`serve.py` のトップページと `help.html` がHTTP 200を返すことを確認
- JavaScript構文：`app.js` / `ui-enhance.js` / `compatibility.js` / `material-preview.js` / `psd-compat.js` / `water-worker.js` / `water-worker-v8.js` / `sw.js` の8ファイルすべてNode構文検査OK
- HTML既存ID：v10の260個をすべて維持。v11で3個（ヘルプボタン、更新通知、通知閉じるボタン）を追加
- `app.js` の編集差分：既存のヘルプ項目とメニュー位置計算のみ。描画・保存・ブラシエンジンの関数は変更していません

## ブラウザ実機検査について
- Playwrightから起動した環境内Chromiumは、ローカルHTTPおよび`file://`ページへのナビゲーションを `ERR_BLOCKED_BY_ADMINISTRATOR` で拒否しました。
- そのため、画材選択ポップアップの実表示、実際のEdge上でのスクロール、タブレット筆圧、Service Worker更新挙動はこの環境では実機確認できていません。
- Windows版Edge向けの手動確認項目を `EDGE_CHECKLIST_v11_JA.md` に20項目まとめました。

## 仕様上の注意
- 121項目は新規UI強化・操作性・アクセシビリティ・既存機能の維持・回帰確認を細分化したチェックリストです。121種類の独立した描画エンジンを新規追加したという意味ではありません。
- OS強制ハイコントラスト、ブラウザ拡張によるCSS上書き、ペンタブレットドライバー固有の問題は、アプリだけで完全制御できません。
- 作品データ形式はv10の`.pforge` version 5を維持。Undo / Redo履歴スタック自体は保存しません。
