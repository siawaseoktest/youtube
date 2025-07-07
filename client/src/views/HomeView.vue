<template>
  <div>
    <HeaderSearch @search="handleSearch" />

    <!-- 検索中の表示 -->
    <div v-if="searchLoading" class="loading">検索中...</div>
    <div v-if="searchError" class="error">{{ searchError }}</div>

    <!-- カテゴリ切り替えボタン（検索中は非表示） -->
    <nav v-if="!isSearching" class="category-nav">
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
      <!-- 検索結果表示 -->
      <VideoList
        v-if="
          isSearching && !searchLoading && !searchError && searchResults.length
        "
        :videos="searchResults"
        :title="`検索結果: 「${searchKeyword}」`"
      />

      <!-- 検索結果なしメッセージ -->
      <div
        v-if="
          isSearching && !searchLoading && !searchError && !searchResults.length
        "
        class="no-results"
      >
        検索結果が見つかりませんでした。
      </div>

      <!-- 急上昇動画表示（検索してない時） -->
      <div v-if="!isSearching">
        <div v-if="loading">読み込み中...</div>
        <div v-if="error" class="error">{{ error }}</div>

        <VideoList
          v-if="!loading && !error && selectedVideos.length"
          :videos="selectedVideos"
          :title="currentCategoryLabel"
        />
      </div>
    </main>
  </div>
</template>

<script>
import HeaderSearch from "@/components/HeaderSearch.vue";
import VideoList from "@/components/VideoList.vue";

export default {
  components: { HeaderSearch, VideoList },
  data() {
    return {
      trend: {
        trending: [],
        music: [],
        gaming: [],
      },
      loading: false,
      error: null,
      selectedCategory: "trending", // 初期は急上昇
      categories: [
        { key: "trending", label: "急上昇" },
        { key: "gaming", label: "ゲーム" },
        { key: "music", label: "音楽" },
      ],

      // 検索用
      searchKeyword: "",
      searchResults: [],
      searchLoading: false,
      searchError: null,
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
    isSearching() {
      return this.searchKeyword !== "";
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

    async handleSearch(keyword) {
      this.searchKeyword = keyword;
      this.searchResults = [];
      this.searchError = null;
      if (!keyword) {
        // 空検索なら検索結果クリアしてトレンドに戻る
        this.searchKeyword = "";
        return;
      }
      this.searchLoading = true;

      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(keyword)}`);
        if (!res.ok) throw new Error("検索失敗");
        const data = await res.json();
        // 例: data.results に動画配列が入っている想定
        this.searchResults = data.results || [];
      } catch (e) {
        this.searchError = e.message || "検索中にエラーが発生しました";
      } finally {
        this.searchLoading = false;
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
.no-results {
  padding: 1rem;
  text-align: center;
  color: #666;
}
main {
  padding: 1rem;
}
</style>
