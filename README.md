# youtube代替サイト
開発中です(？)

## siatubeの展開方法


### 1. index.html の取得
以下から `index.html` をコピーしてください。

👉 https://github.com/ajgpw/youtube/tree/main/client/dist/index.html


### 2. HTML の変換
コピーしたHTMLを、以下のページに貼り付けて変換します。

👉 https://ajgpw.github.io/%E3%81%97%E3%81%82tube/meker/

変換後のHTMLをコピーしてください。


### 3. Google Apps Script で展開
1. https://script.google.com/ にアクセス
2. 新しいプロジェクトを作成
3.  `コード.gs` を以下に書き換える

```javascript
// Code.gs
function doGet(e) {
  return HtmlService
    .createHtmlOutputFromFile('index')
    .setTitle('siatube')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
```

静的デプロイ用[https://github.com/ajgpw/youtube.git](https://github.com/ajgpw/youtube.git)
