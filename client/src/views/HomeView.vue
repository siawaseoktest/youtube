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
      const found = this.categories.find(c => c.key === this.selectedCategory);
      return found ? found.label : "";
    },
  },
  created() {
    this.fetchTrendData();
  },
  methods: {
    async fetchTrendData() {
      this.loading = true;
      this.error = null;
      try {
        const res = await fetch("/api/trend");
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
</style>
