
# GAS Webアプリ デプロイ手順

## コード

```javascript
function doGet() {
  const text = UrlFetchApp.fetch(
    'https://raw.githubusercontent.com/ajgpw/youtube/refs/heads/main/index.html.txt'
  ).getContentText();
  return HtmlService.createHtmlOutput(text)
                    .setTitle('しあtube')
                    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
````

## 手順

1. Google Apps Script のエディタを開き、上記のコードを貼り付ける
2. 右上の **「デプロイ」** をクリック
3. **「新しいデプロイ」** を選択
4. 種類から **「ウェブアプリ」** を選択
5. 必要に応じて説明を入力し、アクセス権限を設定
6. **「デプロイ」** をクリック
7. 認証画面が出た場合は、指示に従って認証を完了
8. デプロイ完了後に表示されるURLにアクセスすると、
   GitHub 上の `index.html.txt` のHTMLが実行されます


<br>
siatube.web@gmail.com
<br>
  <a href="utm_source=invitation&utm_medium=link_copy&utm_campaign=default">オープンチャット</a>

