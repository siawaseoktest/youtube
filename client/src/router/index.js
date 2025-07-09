import { createRouter, createWebHistory } from "vue-router";
import HomeView from "@/views/HomeView.vue";
import VideoPlayer from "@/views/VideoPlayer.vue";
import SearchView from "@/views/SearchView.vue";  

const routes = [
  {
    path: "/",
    name: "Home",
    component: HomeView,
  },
  {
    path: "/watch",
    name: "VideoPlayer",
    component: VideoPlayer,
    props: (route) => ({ videoId: route.query.v }),
  },
  {
    path: "/search",
    name: "Search",
    component: SearchView,
    props: (route) => ({ query: route.query.q || "" }),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
