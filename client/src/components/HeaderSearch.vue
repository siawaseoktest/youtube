<template>
  <div class="header-wrapper fixed-header">
    <button
      type="button"
      class="home-button"
      @click="$router.push('/')"
      aria-label="トップページへ戻る"
    >ホーム
    </button>

    <form @submit.prevent="onSubmit" class="header-search" ref="searchFormRef">
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
      <!-- 🔍検索ボタンの前に追加 -->
<button
  v-if="query"
  type="button"
  class="clear-button"
  @click="clearQuery"
  aria-label="入力をクリア"
>
  ×
</button>

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
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";

const emit = defineEmits(["search"]);

const query = ref("");
const suggestions = ref([]);
const selectedIndex = ref(-1);
let fetchController = null;

const searchFormRef = ref(null);

const onClickOutside = (event) => {
  if (searchFormRef.value && !searchFormRef.value.contains(event.target)) {
    suggestions.value = [];
    selectedIndex.value = -1;
  }
};

onMounted(() => {
  document.addEventListener("click", onClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", onClickOutside);
});

const fetchSuggestions = async (keyword) => {
  if (!keyword) {
    suggestions.value = [];
    selectedIndex.value = -1;
    return;
  }
  if (fetchController) fetchController.abort();
  fetchController = new AbortController();

  try {
    const res = await fetch(
      `https://siawaseok.duckdns.org/api/suggest?keyword=${encodeURIComponent(keyword)}`,
      { signal: fetchController.signal }
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
  if (selectedIndex.value < 0) selectedIndex.value = suggestions.value.length - 1;
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
  const trimmed = query.value.trim();
  if (!trimmed) return;
  suggestions.value = [];
  selectedIndex.value = -1;
  emit("search", trimmed);
};

const onSubmit = () => {
  submitSearch();
};
const clearQuery = () => {
  query.value = "";
  suggestions.value = [];
  selectedIndex.value = -1;
};

</script>

<style scoped>
.clear-button {
  position: absolute;
  right: 1.9em;
  bottom: -1px; 
  background: transparent;
  border: none;
  font-size: 1.5em;
  cursor: pointer;
  color: #555;
  padding: 0 0.5em;
  height: calc(100% - 1px);
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  user-select: none;
  transition: color 0.2s ease;
}

.clear-button:hover {
  color: #000; 
}

.header-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 100vw;
  padding: 0.5rem 1rem;
  box-sizing: border-box;
  background-color: white;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  height: 54px; 
  position: fixed; 
  top: 0;
  left: 0;
}

.home-button {
  border: none;
  background:rgb(184, 184, 184);
  color:rgb(78, 77, 77);
  font-size: 16px;
  border-radius: 10%;
  width: auto;
  height: 36px;
  cursor: pointer;
  user-select: none;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.5s ease;
  flex-shrink: 0;
}

.home-button:hover {
  background:rgb(136, 136, 136);
}

.header-search {
  display: flex;
  align-items: center;
  flex: 1;
  max-width: 600px;
  margin: 0 auto;
  position: relative;
  height: 40px; 
}

.search-input {
  flex: 1;
  height: 100%;
  padding: 5px 12px 7px 12px; 
  line-height: 28px;
  border-radius: 20px 0 0 20px;
  border: 1px solid #ccc;
  outline: none;
  font-size: 0.9rem;
  box-sizing: border-box;
  text-align: left;
  vertical-align: middle;
}

.search-button {
  border-radius: 0 20px 20px 0;
  border: 1px solid #ccc;
  border-left: none;
  background-color: #f8f8f8;
  cursor: pointer;
  padding: 0 0.75em;
  font-size: 1.1rem;
  user-select: none;
  height: 100%;
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
