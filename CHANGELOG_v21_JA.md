# PIXEL FORGE STUDIO v21.0 変更履歴

## 最優先修正：Android／iPhoneでホームが表示されない問題

- `body.pf-home-active` をHTMLの初期状態に設定。JavaScript・IndexedDB・ブラシ初期化の完了を待たずにホームを表示します。
- 初期表示専用のインラインガードを追加。外部JavaScriptが遅い／失敗した場合もホームの表示条件が成立します。
- CSSにもファーストペイント用のフォールバックを追加し、モバイルでは専用ヘッダー・ヒーロー・下部ドックを表示します。
- アプリ初期化の開始直後にホームを表示し、ホーム操作のイベントを先に登録。
- 初期化エラーを捕捉してホームを維持し、画面内に警告を表示するよう変更。
- iOS Safariで問題になりやすい、ルート要素を `overflow:hidden` にしたまま body だけをスクロールさせる構成をホーム表示中は解除。
- `visualViewport` のリサイズ・画面回転を監視し、表示モードを再判定。
- `matchMedia` の未対応・例外時は画面幅を使うフォールバックを追加。
- Viewport meta からChromium向けの `interactive-widget` 指定を外し、標準的なモバイルViewport指定に統一。
- Service Workerのキャッシュ名をv21へ更新し、v21専用CSS／JSをプリキャッシュ。

## 維持

- 既存の描画エンジン、ブラシ、レイヤー、アニメーション、PSD互換、IndexedDB、`.pforge` 形式（version 5）を置き換えていません。
- PC／スマホのホームは同じ作品ライブラリと同じ既存操作へ接続します。
- v19で追加した複数選択・一括削除も残しています。

## 検証上の注意

Chromium実ブラウザでHTML/CSSを直接読み込むオフラインDOMテストを実施。Android・iPhoneのUser-Agent、320px幅、横向き幅、PC幅で初期表示・モード切替・横はみ出し・操作接続を確認しています。実端末のiOS Safari／Android Chromeそのものを操作したテストではありません。
