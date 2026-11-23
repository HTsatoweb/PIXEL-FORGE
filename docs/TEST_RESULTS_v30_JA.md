# PIXEL FORGE STUDIO v30.0 検査結果

## 今回の修正
- スマホエディタ上部のロゴが残り幅を占有して操作ボタンを右端へ押し出す構造を修正。コマンド・ホーム・全体設定・新規・保存の5ボタンをロゴの直後から左詰めに配置。
- 360px以下ではロゴとアイコン幅をさらに圧縮。
- アイコンだけになる4ボタンに `aria-label` を追加。
- PIXEL FORGE専用Cache Storageの容量・ファイル数表示、キャッシュ0化、Service Worker解除、再有効化を追加。
- 近未来のネオン走査ライン、押下縮小、ホバー浮上、選択ツール輪郭、保存カード走査光を追加。

## 静的検査結果
- JavaScript：11ファイルすべて `node --check` 合格。
- CSS：6ファイルを入れ子のmedia/keyframesも含めて解析し、構文エラー0件。
- HTML：507個のIDを確認、重複0件。v29の504個の既存IDはすべて保持し、新しいIDを3個追加。
- HTML内のローカルCSS／JS／画像参照：19要素を検査、欠落0件。
- manifest.webmanifest：JSONとして正常。
- Service Worker：v30用CSS／JS／変更履歴・検査資料の参照先を確認。
- スマホヘッダー：flex左詰め、固定幅アクション、LTR、320px以下の圧縮ルールをソース上で確認。

## キャッシュ機能のモック単体テスト
ブラウザAPIを模したテストで、PIXEL FORGEのキャッシュだけを対象に容量集計・削除・Service Worker解除・オフライン無効化・再有効化を確認。
- PIXEL FORGEキャッシュ：3,724 B / 2ファイルを検出。
- キャッシュ0化：アプリ専用キャッシュを削除し、表示が `0 B` となることを確認。
- 同一オリジンに存在する別名キャッシュは削除しないことを確認。
- 当該アプリのService Worker登録だけを解除することを確認。
- 無効化フラグの保存と再有効化時の削除を確認。
- IndexedDB削除APIやlocalStorage全消去を呼び出さないことをソース上で確認。

## 実ブラウザ・実機に関する制限
この実行環境ではChromium起動・ページ表示が `ERR_BLOCKED_BY_ADMINISTRATOR` でブロックされたため、実ブラウザを使ったクリック／描画／保存／Cache Storage削除のE2E試験は実行できませんでした。したがって、実際の端末でレイアウトが正しく見えることや、実機でのクリック成功を確認済みとはしていません。

iPhone Safari、Android Chrome、iPad等の実機での筆圧入力、OSキーボード表示中のviewport、PWA再インストール挙動は未確認です。`MOBILE_REPAIR_CHECKLIST_100_JA.md` は実機での最終確認用チェックシートです。

## キャッシュ削除の範囲
この機能は `pixelforge-web-` で始まるPIXEL FORGE専用Cache Storageと、現在のアプリ配置パスに対応するService Worker登録を削除します。同一オリジンにある別アプリ名のキャッシュは保持します。IndexedDBの作品、localStorageの設定、.pforgeファイルは削除しません。ブラウザ内部のHTTPメモリ／ディスクキャッシュはWebアプリ側から削除できません。
