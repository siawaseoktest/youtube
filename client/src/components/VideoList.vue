<template>
  <section>
    <h2>{{ title }}</h2>
    <ul class="video-list">
      <li v-for="video in videos" :key="video.id" class="video-item">
        <router-link :to="`/watch?v=${video.id}`" class="thumbnail-link">
          <div
            class="thumbnail-wrapper"
            :data-duration="formatDuration(video.duration)"
          >
            <img
              :src="getPrimaryThumbnail(video.id)"
              :alt="video.title"
              @error="onImageError($event, video.id)"
            />
          </div>
        </router-link>

        <div class="info">
          <h3>
            <router-link
              :to="`/watch?v=${video.id}`"
              class="title-link"
            >
              {{ video.title }}
            </router-link>
          </h3>

          <div class="channel-info">
            <img
              :src="video.channelIcon"
              :alt="video.channel + 'のアイコン'"
              class="channel-icon"
              @error="onChannelIconError"
            />
            <a
              :href="`https://www.youtube.com/channel/${video.channelId}`"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ video.channel }}
            </a>
          </div>

          <p>
            {{ formatViewCount(video.viewCount) }}回視聴・{{
              formatPublishedAt(video.publishedAt)
            }}
          </p>
        </div>
      </li>
    </ul>
  </section>
</template>


<script>
export default {
  props: {
    videos: {
      type: Array,
      required: true,
    },
    title: {
      type: String,
      default: "動画リスト",
    },
  },
  methods: {
    // duration を mm:ss または hh:mm:ss 表記に変換（ISO8601か文字列形式対応）
    formatDuration(input) {
      if (!input) return "";

      // ISO8601形式をパース
      const isoMatch = input.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      const pad = (n) => n.toString().padStart(2, "0");
      if (isoMatch) {
        // キャプチャ部分のみ parseInt
        const [h, m, s] = isoMatch.slice(1).map(v => parseInt(v || "0"));
        const totalSeconds = (h * 3600) + (m * 60) + s;
        const hh = Math.floor(totalSeconds / 3600);
        const mm = Math.floor((totalSeconds % 3600) / 60);
        const ss = totalSeconds % 60;
        return hh ? `${hh}:${pad(mm)}:${pad(ss)}` : `${mm}:${pad(ss)}`;
      }

      // mm:ss または hh:mm:ss 形式の文字列を簡易チェックして整形
      const timeParts = input.split(":");

      if (
        timeParts.length === 2 &&
        timeParts.every((part) => /^\d+$/.test(part))
      ) {
        // mm:ss
        const [mm, ss] = timeParts;
        return `${parseInt(mm)}:${pad(parseInt(ss))}`;
      } else if (
        timeParts.length === 3 &&
        timeParts.every((part) => /^\d+$/.test(part))
      ) {
        // hh:mm:ss
        const [hh, mm, ss] = timeParts;
        return `${parseInt(hh)}:${pad(parseInt(mm))}:${pad(parseInt(ss))}`;
      }

      // 対応しない形式は空文字
      return "";
    },

    formatPublishedAt(input) {
      if (!input) return "不明";

      // ISO8601形式か判定
      const isoDate = new Date(input);
      if (!isNaN(isoDate.getTime())) {
        const now = new Date();
        const diffMs = now - isoDate;
        const minutes = Math.floor(diffMs / (1000 * 60));
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (minutes < 1) return "たった今";
        if (minutes < 60) return `${minutes}分前`;
        if (hours < 24) return `${hours}時間前`;
        if (days === 1) return "1日前";
        return `${days}日前`;
      }

      // 日本語の相対表現ならそのまま返す
      if (/^\d+日前$/.test(input) || /^\d+時間前$/.test(input) || /^\d+分前$/.test(input) || input === "たった今") {
        return input;
      }

      // それ以外は入力をそのまま返す
      return input;
    },

    getPrimaryThumbnail(id) {
      return `https://i.ytimg.com/vi/${id}/sddefault.jpg`;
    },
    onImageError(event, id) {
      if (!event.target.dataset.error) {
        event.target.src = `/api/yt-img?id=${id}`;
        event.target.dataset.error = true;
      }
    },
    onChannelIconError(event) {
      event.target.style.display = "none";
    },

    formatViewCount(num) {
      if (!num) return "0";
      if (num < 10000) return num.toLocaleString();
      if (num < 100000000) {
        return (num / 10000).toFixed(1).replace(/\.0$/, "") + "万";
      }
      return (num / 100000000).toFixed(1).replace(/\.0$/, "") + "億";
    },
  },
};
</script>

<style scoped>
  
html, body {
  margin: 0;
  padding: 0;
  font-family: Meiryo, "メイリオ", sans-serif;
}
  
.video-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.2rem;
}

.video-item {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.video-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}

.thumbnail-wrapper {
  position: relative;
  width: 100%;
  padding-top: 56.25%;
  background-color: #f0f0f0;
}

.thumbnail-wrapper img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-wrapper::after {
  content: attr(data-duration);
  position: absolute;
  bottom: 6px;
  right: 6px;
  background-color: rgba(0, 0, 0, 0.75);
  color: white;
  font-size: 0.8rem;
  padding: 4px 8px;
  border-radius: 3px;
  font-weight: bold;
  pointer-events: none;
}

.info {
  padding: 1rem;
}

.info h3 {
  font-size: 1.1rem;
  margin: 0 0 0.5rem;
  line-height: 1.4;
  color: #222;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.info h3 a,
.channel-info a {
  color: #000;
  text-decoration: none;
  transition: color 0.2s ease;
}

.info h3 a:hover,
.channel-info a:hover {
  color: #444;
  text-decoration: underline;
}

.info p {
  font-size: 0.9rem;
  color: #555;
  margin: 0.3rem 0;
  line-height: 1.4;
}

.channel-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.3rem;
}

.channel-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
}
</style>