// APIエンドポイント、全部アカウント変えて作ってる
const API_URLS = [
  "https://script.google.com/macros/s/AKfycbzqpav7y2x3q756wRSOhBzaXf-2hKaLTvxoFN8kFegrIvamH03ZXphEw2PK30L7AstC/exec",
  "https://script.google.com/macros/s/AKfycbyXCS6JsBglbqlW0eIOWpVscTdNA8QUISRaGMJUAiMlYfp4Ju-Avkw1ai3A6P_ek-FK/exec",
  "https://script.google.com/macros/s/AKfycby5bmMQBShFOv_inDOo9jUjwxjdF6PeIh8spKAncj0-h5idAHYodOy-jj9YZStcYa-L/exec",
  "https://script.google.com/macros/s/AKfycbw5Cci8LSWChLvGf17uNW5cZDqESr0XFuI3QNZDRsdn5su1K4VzTfB0oq7SKNXzimT1Aw/exec",
  "https://script.google.com/macros/s/AKfycbwJFbZ4CHnuvy8rppZLfbWWuOHMqaM89nlsv7gThIzW_x0Bn2cj7IJU6XHC5CHG2B-yqQ/exec",
  "https://script.google.com/macros/s/AKfycbzYHLmomiijxiaNGcdLY_ddDZIi3QTK408EQDEpsa82FtIt4VTGRuC8ovZxM7kUSrC2/exec",
  "https://script.google.com/macros/s/AKfycbygQyKvfPnMvY8sdOkKow6NzO91dBhQFy0Vex3qVq1tWnqKodNbFVKQhALWWBLXcRTF/exec",
  "https://script.google.com/macros/s/AKfycbyh11OPhy_xaZOPVz3uKVFy8qdN05hVRrpKrNXuIeogsTLwiQQYBUhKZMniStVhg7QF-A/exec",
  "https://script.google.com/macros/s/AKfycbyjbFpmnhvs0BSorjNuIoZkIOsiH7OsovlYkl3DBI9SA3_19jOBqjr999WA_12HYxhT0A/exec"
];

// ランダムに1つ返す関数
export function apiurl() {
  const index = Math.floor(Math.random() * API_URLS.length);
  return API_URLS[index];
}
