<template>
  <div v-if="video">
    <h2>{{ video.title }}</h2>
    <iframe
      :src="`https://www.youtube.com/embed/${video.id}`"
      width="100%"
      height="360"
      frameborder="0"
      allowfullscreen
    ></iframe>
    <p>{{ video.description }}</p>
  </div>
  <p v-else>読み込み中...</p>
</template>

<script>
export default {
  props: {
    videoId: String,
  },
  data() {
    return {
      video: null,
    };
  },
  async created() {
    try {
      const res = await fetch(`/api/video/${this.videoId}`);
      this.video = await res.json();
    } catch (err) {
      console.error("動画取得失敗:", err);
    }
  },
};
</script>