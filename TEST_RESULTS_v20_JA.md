# v20 検証結果

## PASS：自動チェック

- `node --check app.js` — PASS
- `node --check ui-enhance.js` — PASS
- `node --check compatibility.js` — PASS
- `node --check psd-compat.js` — PASS
- `node --check home-ui-v20.js` — PASS
- `node home-ui-v20_smoke.cjs` — PASS（PC／スマホモード切替フラグ、5つのホーム操作の既存ボタンへのルーティング、作品数の同期をモックDOMで確認）
- `node brush_dynamics_smoke_v17.cjs` — PASS（既存の筆圧・傾き・毛束経路7項目）
- `node library_bulk_smoke_v19.cjs` — PASS（選択・一括削除・IndexedDB整合性・自動保存ポインター）
- `python verify_v20.py` — PASS（HTML ID 465個・重複なし／既存ID維持／PWAキャッシュ23ファイル実在／保存形式v5／PC・スマホ用マークアップ）
- tinycss2 — PASS（3 CSSファイルの構文・ネストしたメディアクエリ・宣言を解析）

## 未実施：実ブラウザの画面操作

`browser_smoke_v20.py` はPlaywrightでPC・375px・320px・横画面、ダイアログ、設定、ライブラリ更新、一括削除を確認するテストです。ただし、この実行環境では `http://127.0.0.1` と `file://` のページ遷移がブラウザ管理ポリシーにより `ERR_BLOCKED_BY_ADMINISTRATOR` となり、実行を完了できませんでした。したがって実ブラウザでの表示・タッチ確認は未実施です。

## 未保証

iPhone Safari、Android Chrome、iPad分割画面などの実機固有挙動は未確認です。実機で最終確認してください。今回の変更はホーム画面表示を中心としており、描画エンジンや作品データ形式は変更していません。
