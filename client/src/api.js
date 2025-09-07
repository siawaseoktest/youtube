// 複数のAPIエンドポイント
const API_URLS = [
  "https://script.google.com/macros/s/AKfycbzqpav7y2x3q756wRSOhBzaXf-2hKaLTvxoFN8kFegrIvamH03ZXphEw2PK30L7AstC/exec",
  "https://script.google.com/macros/s/AKfycbzvFclFgt2ys3RDp89L0Tdntsdbgr2iSnnwHcJhsydL3lBWK1nTTT-Ya28xoDl7wWFATg/exec",
  "https://script.google.com/macros/s/AKfycbxdoa669pQcZD_-U4lTvHP19q7XvtWONJ6RMTd9-qfmLksqIp7MUfuySQ3odr_1hWXuQA/exec"
];

// ランダムに1つ返す関数
export function apiurl() {
  const index = Math.floor(Math.random() * API_URLS.length);
  return API_URLS[index];
}
