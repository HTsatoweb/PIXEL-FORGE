# PIXEL FORGE STUDIO v46.0 — 旧版ファイルの保全ガイド

このリリースでは、既存機能を取り違えたり失ったりしないよう、元ZIPに含まれていたファイルを削除していません。

| ファイル | v46での扱い |
|---|---|
| `js/window-manager-v44.js` | 旧ウィンドウ管理の履歴用。現行`index.html`からは読み込みません。実行中の管理は`js/window-manager-v45.js`が担当します。 |
| `css/window-manager-v44.css` | VisualViewportによるダイアログ高さ・位置調整のCSSを含むため、v46で`index.html`から読み込むよう修正しました。 |
| `js/ui-layout-studio-v41.js` | 旧UI配置処理の履歴用。現行では`js/ui-layout-studio-v43.js`を読み込みます。 |
| `docs/FILE_MANIFEST_v39.json` | v39時点の履歴マニフェスト。現行のファイル一覧としては使用しません。 |
| `docs/CHANGELOG_v25_JA.md`以降の旧版文書 | 変更履歴として保持しています。現行の導入手順は`START_HERE_JA.md`を参照してください。 |

旧ファイルは存在するだけで現行アプリへ自動実行されるものではありません。`index.html`のscript／stylesheet参照と`sw.js`のキャッシュ一覧が、実際の起動対象です。

## ファイル保全

v46 ZIPは元v45 ZIPに含まれていた119ファイルをすべて保持しています。追加・更新されたリリース文書は旧版ファイルを置き換えず、`v46`付きの別名で追加しています。`FILE_MANIFEST_v46.json`はこのリリースのファイル一覧・サイズ・SHA-256を記録します（マニフェスト自身は自己ハッシュの循環を避けるため一覧対象外です）。
