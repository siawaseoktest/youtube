// APIエンドポイント、全部アカウント変えて作ってる
const API_URLS = [
  "https://script.google.com/macros/s/AKfycbzqpav7y2x3q756wRSOhBzaXf-2hKaLTvxoFN8kFegrIvamH03ZXphEw2PK30L7AstC/exec",
  "https://script.google.com/macros/s/AKfycbzqpav7y2x3q756wRSOhBzaXf-2hKaLTvxoFN8kFegrIvamH03ZXphEw2PK30L7AstC/exec"
];

// ランダムに1つ返す関数
export function apiurl() {
  const index = Math.floor(Math.random() * API_URLS.length);
  return API_URLS[index];
}
