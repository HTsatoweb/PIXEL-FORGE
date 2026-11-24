# PIXEL FORGE STUDIO v50.0 — テスト結果

## 実ブラウザー（Chromium）

| 画面幅 | 設定パネル | × | Esc | 画面高さ変更 | 備考 |
|---:|---|---|---|---|---|
| 320px | 開く | OK | OK | 開いた状態を維持 | タブ5種切替中も開いたまま |
| 390px | 開く | OK | OK | 開いた状態を維持 | ×のヒットテストがボタン本人 |
| 500px | 開く | OK | OK | 開いた状態を維持 | スクリーン露出部分クリックOK |
| 768px | 開く | デスクトップトグルOK | — | 開いた状態を維持 | 小PC |
| 1024px | 開く | デスクトップトグルOK | — | 開いた状態を維持 | 小PC |
| 1280px | 開く | デスクトップトグルOK | — | 開いた状態を維持 | — |
| 1365px | 開く | デスクトップトグルOK | — | 開いた状態を維持 | — |

カテゴリタブ：`tools / color / brush / layers / more` の各切替後に `mobile-panel-open` が維持されることを確認。

## 画材診断

`PF_DIAGNOSTICS.runMaterialDistinctionRegression()` の結果：
- passed: true
- materialCount: 9
- uniqueMaterialSignatures: 9
- 対象：crayon、waxCrayon、chalk、chalkDust、pastel、coloredPencil、charcoal、conte、oilPastel

画材ごとの描画ピクセル数・テクスチャ指標・部分透明ピクセル数が異なり、濃さだけでなく筆跡模様が区別されていることを確認。

## JavaScriptランタイム

- テスト中の uncaught page errors: 0
- スマホ設定パネル×のヒットテスト：320／390pxで最前面の要素が `#mobilePanelClose`。

## 制限

テスト用インラインHTMLは `about:blank` オリジンで動かしているため、ブラウザーがlocalStorage／IndexedDBを拒否する警告があります。これらはこのテストオリジンの制限で、通常のlocalhost配信のストレージテスト結果ではありません。iPhone／Androidの実機、PSD全互換、大容量データのベンチマークは未確認です。

## 追加の回帰テスト

- 消しゴム回帰：6/6項目成功。
- レインボー描画回帰：6/6項目成功。
- レインボー線の混色・指先混色回帰：3/3項目成功。
- 画材差別化：9/9種類の描画署名が異なる。
- UI整理ボタン：PC上部ツールバーに移動し、クリックで管理パネルが開くことを確認。
- 小画面PC（768×700）で右パネルのブラシ設定にUI整理ボタンが重ならないことをスクリーンショットで確認。
- 全診断実行時のuncaught page errors：0件。
