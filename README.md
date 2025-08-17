# しあtube静的デプロイ用

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
### 4.	変換済みHTMLを index.html として追加
	•	メニュー → 「新規作成」 → 「HTMLファイル」 → 名前を index にする
	•	中身にコピーしたHTMLを貼り付ける

### 5. Webアプリとしてデプロイ
•	メニュー → 「デプロイ」 → 「新しいデプロイ」
•	「種類を選択」 → 「Webアプリ」
•	「アクセスできるユーザー」 → 「全員（匿名ユーザー含む）」に設定
•	デプロイ → 公開URLが発行される

