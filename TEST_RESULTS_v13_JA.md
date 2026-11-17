# PIXEL FORGE STUDIO v13.0 検査結果

## 静的・自動検査

- `index.html`内の単一選択`select`を22個確認。
- 共通カスタム選択UIは`document.querySelectorAll('select')`で初期全要素に適用し、後から追加されたselectもMutationObserverで検出する構成。
- 複数選択／size>1は本アプリの初期構成に存在せず、誤った単一選択UI化を避ける除外条件あり。
- `compatibility.js` JavaScript構文：Node.js `--check`で確認。
- 既存のJavaScriptファイル構文検査：Node.js `--check`で実施。
- HTML ID重複とv10基準ID維持を確認する検証スクリプトを同梱。
- `index.html`・`help.html`ローカル参照とService Workerキャッシュ対象を検証。
- `.pforge`識別子とversion 5を維持。
- 既存のフレーム読込スモークテストを引き継ぎ。
- チェックリスト：179項目（機能・内部対策・回帰確認を含む）。

## カスタム選択UIで確認するコード経路

- 初期HTMLにある全selectへの共通インストール。
- 後からDOMへ追加されたselectの検出。
- optionの追加・削除・hidden・disabled変更に伴う候補の再描画。
- JavaScriptからのvalue / selectedIndex直接代入時の表示同期。
- 選択確定時のinput / changeイベント送出。
- フォームreset後の表示同期。
- option / optgroup単位の無効状態。
- label[for]から表示トリガーへのフォーカス／起動経路。
- 検索・矢印・Home/End・PageUp/PageDown・Enter・Esc。
- 画面上下左右に合わせたポップアップ位置調整。
- 外側クリック・ページ離脱時の閉鎖。

## 実機確認が必要

この環境ではWindows版Edgeを実際に操作できないため、ネイティブ白画面が実機で解消したか、Windows表示倍率・Edgeズーム・各ペンタブレットでの体感を最終確認できていません。`EDGE_CHECKLIST_v13_JA.md`に実機確認項目を記載しています。

## 対象外

OSファイルダイアログ、Windowsの色ダイアログ、ブラウザ権限UIはWebページから置き換えできません。`input type=color`は本更新のselectメニュー対象外です。
