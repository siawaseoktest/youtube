<template>
  <div>
    <!-- カテゴリ切り替えボタン -->
    <nav class="category-nav">
      <button
        v-for="cat in categories"
        :key="cat.key"
        :class="{ active: selectedCategory === cat.key }"
        @click="selectedCategory = cat.key"
      >
        {{ cat.label }}
      </button>
    </nav>

    <main>
      <div v-if="loading" class="loading">読み込み中...</div>
      <div v-if="error" class="error">{{ error }}</div>

      <VideoList
        v-if="!loading && !error && selectedVideos.length"
        :videos="selectedVideos"
        :title="currentCategoryLabel"
      />
    </main>
    <footer class="footer">
      <p>しあtube</p>
      <p>
        <a href="https://github.com/siawaseoktest/youtube" target="_blank" rel="noopener noreferrer">GitHub</a> |
        <a href="https://www.google.com/url?q=https%3A%2F%2Fline.me%2Fti%2Fg2%2FvCj1dWEoRZTALbC0n1w53si3-KJ8OTXnfjV6aw%3Futm_source%3Dinvitation%26utm_medium%3Dlink_copy%26utm_campaign%3Ddefault&sa=D&sntz=1&usg=AOvVaw0AaRwnxB0yifPSGZ1TbcS5" target="_blank" rel="noopener noreferrer">LINE</a>
      </p>
    </footer>
  </div>
</template>

<script>
import VideoList from "@/components/VideoList.vue";

export default {
  components: { VideoList },
  data() {
    return {
      trend: {
        trending: [],
        music: [],
        gaming: [],
      },
      loading: false,
      error: null,
      selectedCategory: "trending",
      categories: [
        { key: "trending", label: "急上昇" },
        { key: "gaming", label: "ゲーム" },
        { key: "music", label: "音楽" },
      ],
    };
  },
  computed: {
    selectedVideos() {
      return this.trend[this.selectedCategory] || [];
    },
    currentCategoryLabel() {
      const found = this.categories.find(
        (c) => c.key === this.selectedCategory
      );
      return found ? found.label : "";
    },
  },
  created() {
    document.title = "しあチューブ - ホーム";
    this.fetchTrendData();
  },
  methods: {
    async fetchTrendData() {
      this.loading = true;
      this.error = null;
      try {
        const res = await fetch("https://raw.githubusercontent.com/ajgpw/youtubedata/refs/heads/main/trend-base64.json", {redirect: "follow",});
        if (!res.ok) throw new Error("データ取得失敗");
        const data = await res.json();
        this.trend = data;
      } catch (e) {
        this.error = e.message;
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style scoped>
.category-nav {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  justify-content: center;
}
.category-nav button {
  padding: 0.5rem 1rem;
  border: none;
  background: #eee;
  cursor: pointer;
  border-radius: 4px;
  font-weight: bold;
}
.category-nav button.active {
  background-color: #007bff;
  color: white;
}
.error {
  color: red;
  padding: 1rem;
}
.loading {
  padding: 1rem;
  text-align: center;
}
main {
  padding: 1rem;
}
.footer {
  margin-top: 2rem;
  padding: 1rem;
  text-align: center;
  font-size: 0.9rem;
  color: #666;
}

.footer a {
  color: #0077cc;
  text-decoration: none;
  margin: 0 0.5rem;
}

.footer a:hover {
  text-decoration: underline;
}
</style>
