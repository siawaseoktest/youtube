<template>
  <CookieConsent>
    <HeaderSearch @search="onSearch" />
    <router-view />
  </CookieConsent>
</template>

<script>
import HeaderSearch from '@/components/HeaderSearch.vue';
import CookieConsent from '@/components/CookieConsent.vue';

export default {
  name: 'App',
  components: {
    HeaderSearch,
    CookieConsent,
  },
  methods: {
    onSearch(keyword) {
      if (!keyword || !keyword.trim()) return;
      this.$router.push({ path: '/search', query: { q: keyword.trim() } });
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
