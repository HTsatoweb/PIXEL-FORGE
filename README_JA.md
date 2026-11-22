# PIXEL FORGE STUDIO v21.0

ブラウザで動作するローカル優先のデジタルペイントスタジオです。v21ではAndroid／iPhoneでホームが出ない問題を最優先にし、アプリの非同期初期化前からホームを表示する構成に変更しました。

## 起動

Windowsでは `run_local_server.bat` を実行し、`http://localhost:8000/` を開いてください。Service Workerとローカルファイル読込を安定させるため、`file://` 直開きよりlocalhostでの起動を推奨します。

スマホからPC上のサーバーへ接続する場合は、PCとスマホを同じWi-Fiに接続して、PCのIPv4アドレスとポート8000を使います。Windowsファイアウォールで許可が必要な場合があります。

## v21の表示保証

- HTMLの初期状態でホームを表示するため、IndexedDBや描画エンジンの初期化完了を待ちません。
- JavaScript初期化に失敗しても、ホーム画面とエラー案内を残します。
- Android／iPhone幅で専用ホームへ切り替えます。
- iOS Safariでスクロールが止まりやすいhtml/bodyのoverflow組み合わせを修正。
- PCとスマホで作品ライブラリ・保存処理は共通です。

## 既存機能

ブラシ・筆圧・傾き・画材設定・レイヤー・変形・塗りつぶし・スポイト・アニメーション・タイムライン・自動保存・`.pforge`・PSD互換・画像書き出し・作品検索／並べ替え／複製／名前変更／削除を維持しています。作品形式はversion 5です。v19の複数選択・一括削除も維持しています。

## 検証

- `verify_v21.py`：静的ファイル・ID・CSS・キャッシュの確認
- `browser_home_v21_smoke.py`：Chromiumを使ったAndroid／iPhone UA・モバイルレイアウト検証
- `browser_full_v21_smoke.py`：全アプリJSを埋め込んだ起動・新規・設定・ホーム復帰の統合検証
- `home-ui-v21_smoke.cjs`：レスポンシブ切替・操作接続のユニットテスト
- `TEST_RESULTS_v21_JA.md`：実施した検証と未実施事項
- `EDGE_CHECKLIST_v21_JA.md`：Android／iPhone実機での最終確認手順

実端末のAndroid／iPhoneはこの作業環境から直接操作できないため、端末での最終チェックはチェックリストに分けて記載しています。
