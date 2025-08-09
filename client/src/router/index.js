// router/index.js
import { createRouter, createWebHistory } from "vue-router";
import HomeView from "@/views/HomeView.vue";
import VideoPlayer from "@/views/VideoPlayer.vue";
import SearchView from "@/views/SearchView.vue";
import ChannelView from "@/views/ChannelView.vue";
import Playlist from "@/components/Playlist.vue"; 
import '@/css.css'

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
  {
    path: "/channel/:id",
    name: "Channel",
    component: ChannelView,
    props: (route) => ({ channelId: route.params.id }),
  },
  {
    path: "/playlist", 
    name: "Playlist",
    component: Playlist,
    props: (route) => ({
      playlistId: route.query.list || "", 
    }),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
