<template>
  <form @submit.prevent="onSubmit" class="header-search">
    <input
      type="text"
      v-model="query"
      @input="onInput"
      @keydown.down.prevent="moveSelection(1)"
      @keydown.up.prevent="moveSelection(-1)"
      @keydown.enter.prevent="onEnter"
      placeholder="キーワードを入力..."
      autocomplete="off"
      class="search-input"
      aria-label="Search"
    />
    <button type="submit" class="search-button" aria-label="検索">
      <img
        src="https://raw.githubusercontent.com/siawaseok3/siawaseok3.github.io/refs/heads/main/%E6%A4%9C%E7%B4%A2%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3.png"
        alt="🔍"
        style="width: 20px; height: 20px"
      />
    </button>

    <ul v-if="suggestions.length" class="suggestions-list" role="listbox">
      <li
        v-for="(item, index) in suggestions"
        :key="index"
        :class="{ selected: index === selectedIndex }"
        @mousedown.prevent="onSuggestionClick(index)"
        role="option"
        :aria-selected="index === selectedIndex"
      >
        {{ item }}
      </li>
    </ul>
  </form>
</template>

<script setup>
import { ref, watch } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const query = ref("");
const suggestions = ref([]);
const selectedIndex = ref(-1);
let fetchController = null;

const fetchSuggestions = async (keyword) => {
  if (!keyword) {
    suggestions.value = [];
    selectedIndex.value = -1;
    return;
  }
  // キャンセル用にAbortControllerを使う（連続リクエスト対策）
  if (fetchController) fetchController.abort();
  fetchController = new AbortController();

  try {
    const res = await fetch(
      `/api/suggest?keyword=${encodeURIComponent(keyword)}`,
      {
        signal: fetchController.signal,
      }
    );
    if (!res.ok) throw new Error("Network error");
    const data = await res.json();
    suggestions.value = data;
    selectedIndex.value = -1;
  } catch (e) {
    if (e.name !== "AbortError") {
      suggestions.value = [];
      selectedIndex.value = -1;
      console.error(e);
    }
  }
};

const onInput = () => {
  fetchSuggestions(query.value.trim());
};

const moveSelection = (delta) => {
  if (suggestions.value.length === 0) return;
  selectedIndex.value += delta;
  if (selectedIndex.value < 0)
    selectedIndex.value = suggestions.value.length - 1;
  if (selectedIndex.value >= suggestions.value.length) selectedIndex.value = 0;
  query.value = suggestions.value[selectedIndex.value];
};

const onEnter = () => {
  if (selectedIndex.value >= 0) {
    query.value = suggestions.value[selectedIndex.value];
  }
  submitSearch();
};

const onSuggestionClick = (index) => {
  query.value = suggestions.value[index];
  submitSearch();
};

const submitSearch = () => {
  if (!query.value.trim()) return;
  suggestions.value = [];
  selectedIndex.value = -1;
  router.push({ path: "/s", query: { q: query.value.trim() } });
};

const onSubmit = (e) => {
  e.preventDefault();
  submitSearch();
};
</script>

<style scoped>
.header-search {
  display: flex;
  position: relative;
  max-width: 600px;
  margin: 0 auto;
}

.search-input {
  flex: 1;
  padding: 0.5em 1em;
  border-radius: 40px 0 0 40px;
  border: 1px solid #ccc;
  outline: none;
  font-size: 1rem;
  box-sizing: border-box;
  height: 50px;
}

.search-button {
  border-radius: 0 40px 40px 0;
  border: 1px solid #ccc;
  border-left: none;
  background-color: #f8f8f8;
  cursor: pointer;
  padding: 0 1em;
  font-size: 1.1rem;
  user-select: none;
  height: 50px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.suggestions-list {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #ccc;
  border-top: none;
  max-height: 250px;
  overflow-y: auto;
  z-index: 10;
  border-radius: 0 0 10px 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.suggestions-list li {
  padding: 0.5em 1em;
  cursor: pointer;
}

.suggestions-list li.selected,
.suggestions-list li:hover {
  background-color: #f0f0f0;
}
</style>
