<template>
    <HeaderSearch @search="onSearch" />
    <HomeView />
</template>

<script>
import HeaderSearch from '@/components/HeaderSearch.vue';
import HomeView from '@/views/HomeView.vue';

export default {
  name: 'App',
  components: {
    HeaderSearch,
    HomeView,
  },
  methods: {
    onSearch(keyword) {
      if (!keyword || !keyword.trim()) return;
      this.$router?.push({ path: '/search', query: { q: keyword.trim() } });
    },
  },
};
</script>

<style>
#app {
  padding-top: 52px;
  box-sizing: border-box;
}
</style>
