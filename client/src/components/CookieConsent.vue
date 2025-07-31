<template>
  <div>
    <div
      v-if="!consentGiven"
      id="external-html"
      v-html="externalHtml"
      style="width: 100vw; height: 100vh; overflow: auto;"
    ></div>

    <!-- Cookie同意ポップアップ -->
    <div
      v-if="!consentGiven"
      id="cookie-popup"
      class="cookie-popup"
    >
      <p>本サイトはCookieを使用します。許可しますか？</p>
      <button id="accept-cookies" @click="acceptCookies">はい、許可します</button>
    </div>

    <!-- 同意済みならslotの中身（アプリ本体）を表示 -->
    <slot v-if="consentGiven"></slot>
  </div>
</template>

<script>
export default {
  name: "CookieConsent",
  data() {
    return {
      consentKey: "cookie_consent",
      consentGiven: false,
      externalHtml: "",
    };
  },
  methods: {
    hasCookieConsent() {
      return document.cookie.includes(`${this.consentKey}=true`);
    },
    setCookieConsent() {
      const expires = new Date(Date.now() + 365 * 864e5).toUTCString();
      document.cookie = `${this.consentKey}=true; path=/; expires=${expires}`;
    },
    async loadExternalHtml() {
      try {
        const res = await fetch("/api/fallback");
        if (!res.ok) throw new Error("サーバーからHTML取得失敗");
        const htmlText = await res.text();

        const bodyMatch = htmlText.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        const bodyContent = bodyMatch ? bodyMatch[1] : htmlText;

        const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
        let styleMatch;
        while ((styleMatch = styleRegex.exec(htmlText)) !== null) {
          const styleEl = document.createElement("style");
          styleEl.textContent = styleMatch[1];
          document.head.appendChild(styleEl);
        }

        this.externalHtml = bodyContent;
      } catch (e) {
        this.externalHtml =
          '<p style="padding:1em;color:red;">外部HTMLの読み込みに失敗しました。</p>';
        console.error(e);
      }
    },
    acceptCookies() {
      this.setCookieConsent();
      document.cookie = "streamTypeCookie=; path=/;"; // 不要cookie削除
      this.consentGiven = true;
      this.$emit("consent-given");
    },
  },
  mounted() {
    if (this.hasCookieConsent()) {
      this.consentGiven = true;
    } else {
      this.loadExternalHtml();
    }
  },
};
</script>

<style scoped>
.cookie-popup {
  position: fixed;
  right: 20px;
  bottom: 20px;
  max-width: 320px;
  background: #f8f8f8;
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  z-index: 9999;
}

.cookie-popup p {
  margin: 0;
  font-size: 14px;
  color: #333;
}

.cookie-popup button {
  margin-top: 10px;
  padding: 6px 12px;
  font-size: 14px;
  border: none;
  background-color: #0078d4;
  color: white;
  border-radius: 4px;
  cursor: pointer;
}

.cookie-popup button:hover {
  background-color: #005fa3;
}
</style>
