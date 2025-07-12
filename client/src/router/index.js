import { createRouter, createWebHistory } from "vue-router";

// 各ページのVueコンポーネントを読み込み
import HomeView from "@/views/HomeView.vue";
import VideoPlayer from "@/views/VideoPlayer.vue";
import SearchView from "@/views/SearchView.vue";
import ChannelView from "@/views/ChannelView.vue"; // チャンネルページを追加

const routes = [
  {
    path: "/", // ホーム画面
    name: "Home",
    component: HomeView,
  },
  {
    path: "/watch", // 動画再生ページ（クエリ: v=動画ID）
    name: "VideoPlayer",
    component: VideoPlayer,
    props: (route) => ({ videoId: route.query.v }),
  },
  {
    path: "/search", // 検索結果ページ（クエリ: q=検索ワード）
    name: "Search",
    component: SearchView,
    props: (route) => ({ query: route.query.q || "" }),
  },
  {
    path: "/channel/:id", // チャンネルページ（パラメータ: id=チャンネルID）
    name: "Channel",
    component: ChannelView,
    props: (route) => ({ channelId: route.params.id }),
  },
];

const router = createRouter({
  history: createWebHistory(), // 通常のURL構造を使う（#なし）
  routes,
});

export default router;