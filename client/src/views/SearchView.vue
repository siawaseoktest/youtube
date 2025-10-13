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
import { apiurl } from "@/api";

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
    fetchSearchResults(q) {
      this.loading = true;
      this.error = null;

      const cbName = 'jsonp_search_' + Math.random().toString(36).slice(2, 10);
      let timeoutId;

      window[cbName] = (data) => {
        clearTimeout(timeoutId);
        try {
          this.videos = (data && data.results) ? data.results : [];
        } catch (e) {
          this.error = '検索結果の解析に失敗しました';
        }
        this.loading = false;
        cleanup();
      };

      const script = document.createElement('script');
      script.src = `${apiurl()}?q=${encodeURIComponent(q)}&callback=${cbName}`;
      script.onerror = () => {
        clearTimeout(timeoutId);
        this.loading = false;
        this.error = '検索APIの取得に失敗しました (script error)';
        cleanup();
      };

      function cleanup() {
        if (script.parentNode) script.parentNode.removeChild(script);
        try { delete window[cbName]; } catch (e) { window[cbName] = undefined; }
      }

      timeoutId = setTimeout(() => {
        this.loading = false;
        this.error = '検索APIの取得に失敗しました (タイムアウト)';
        cleanup();
      }, 30000);

      document.body.appendChild(script);
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
