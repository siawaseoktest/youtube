<template>
  <div>
    <div v-if="loading" class="loading">読み込み中...</div>
    <div v-if="error" class="error">{{ error }}</div>

    <VideoList
      v-if="!loading && !error && videos.length"
      :videos="videos"
      :title="`検索結果: ${query}`"
    />

    <div v-if="!loading && !error && videos.length === 0" class="no-results">
      検索結果が見つかりませんでした。
    </div>
  </div>
</template>

<script>
import VideoList from "@/components/VideoList.vue";

export default {
  components: { VideoList },
  props: {
    query: {
      type: String,
      default: "",
    },
  },
  data() {
    return {
      videos: [],
      loading: false,
      error: null,
    };
  },
  watch: {
    query: {
      immediate: true,
      handler(newQuery) {
        document.title = newQuery ? `${newQuery} - 検索` : "検索結果";

        if (newQuery) {
          this.fetchSearchResults(newQuery);
        } else {
          this.videos = [];
        }
      },
    },
  },
  methods: {
    async fetchSearchResults(q) {
      this.loading = true;
      this.error = null;

      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (!res.ok) throw new Error("検索APIでエラーが発生しました");
        const data = await res.json();
        this.videos = data.results || [];
      } catch (e) {
        this.error = e.message || "検索に失敗しました";
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style scoped>
.loading {
  padding: 1rem;
  text-align: center;
}
.error {
  color: red;
  padding: 1rem;
}
.no-results {
  padding: 1rem;
  text-align: center;
  color: #666;
}
</style>
