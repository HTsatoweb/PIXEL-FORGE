# PIXEL FORGE STUDIO v34.0 はじめに

1. ZIPを新しいフォルダへ展開します。
2. Windowsは `run_local_server.bat`、macOS/Linuxは `run_local_server.sh` を起動します。
3. PCでは表示されたlocalhost URLを使います。スマホは同じWi-Fi上でPCのLAN IPと同じポートを開きます。
4. ブラウザ・端末・オリジンを変える前に、ホームの「全作品をバックアップ」から `.pfarchive` を保存します。
5. 別環境ではホームの「バックアップを復元」から `.pfarchive` を選びます。

## フォルダ構成

`index.html` と `help.html` はルート直下です。JSは `js/`、CSSは `css/`、画像は `assets/images/`、Markdownは `docs/` です。`sw.js` はルートスコープを保つためルート直下です。

## 既存作品の引き継ぎ

IndexedDBは `PixelForgeDB` / schema version 3 のまま維持しています。同じブラウザ・同じオリジン・同じポートで開けば、保存領域が残っている限り従来作品を読み込めます。保存領域を消した場合やURLを変えた場合は、以前のオリジンで `.pfarchive` を書き出してから新環境で復元してください。
