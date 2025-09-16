// 複数のAPIエンドポイント
const API_URLS = [
  "https://script.google.com/macros/s/AKfycbynFMFgEAEK_XwigztO9VnGdTt2KtMtLoNZiR4H-lsHen6RdqNm32WGTDggZ2PC1D9U/exec",
  "https://script.google.com/macros/s/AKfycbzvFclFgt2ys3RDp89L0Tdntsdbgr2iSnnwHcJhsydL3lBWK1nTTT-Ya28xoDl7wWFATg/exec",
  "https://script.google.com/macros/s/AKfycbxdoa669pQcZD_-U4lTvHP19q7XvtWONJ6RMTd9-qfmLksqIp7MUfuySQ3odr_1hWXuQA/exec"
];

// ランダムに1つ返す関数
export function apiurl() {
  const index = Math.floor(Math.random() * API_URLS.length);
  return API_URLS[index];
}
