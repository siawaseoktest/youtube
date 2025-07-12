<template>
  <section class="comments-section">
    <h2>{{ totalCommentCount }}</h2>

    <ul v-if="comments.length > 0" class="comment-list">
      <li v-for="(c, i) in comments" :key="c.id || i" class="comment-item">
        <img
          v-if="c.authorIcon"
          :src="c.authorIcon"
          alt="アイコン"
          class="comment-author-icon"
          width="32"
          height="32"
          loading="lazy"
        />
        <div class="comment-content">
          <div class="comment-header"><div class="comment-author">{{ c.author }}</div><span class="comment-meta comment-date">{{ c.date }}</span></div>
          <div class="comment-text">{{ c.text }}</div>
          <div class="comment-meta">
            <span class="comment-likes">👍 {{ c.likes }}</span>
          </div>
        </div>
      </li>
    </ul>

    <p v-else-if="!error">コメントが見つかりません。</p>
    <p v-if="error" class="error-msg">⚠️ {{ error }}</p>
  </section>
</template>

<script>
export default {
  name: "Comment",
  props: {
    videoId: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      comments: [],
      totalCommentCount: null,
      error: null
    };
  },
  watch: {
    videoId: {
      immediate: true,
      handler() {
        this.fetchComments();
      }
    }
  },
  methods: {
    async fetchComments() {
      try {
        this.error = null;
        this.comments = [];
        this.totalCommentCount = null;

        const res = await fetch(`/api/comments/${this.videoId}`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        const data = await res.json();

        this.totalCommentCount = data.totalCommentCount || null;

        if (Array.isArray(data.comments)) {
          this.comments = data.comments.map((c, index) => ({
            id: c.id || index,
            author: c.author,
            authorIcon: c.authorIcon,
            text: c.text,
            date: c.date,
            daysAgo: c.daysAgo,
            likes: c.likes ?? 0,
          }));
        } else {
          this.comments = [];
        }
      } catch (err) {
        console.error("コメント取得エラー:", err);
        this.error = "コメントを読み込めませんでした。";
        this.comments = [];
        this.totalCommentCount = null;
      }
    }
  }
};
</script>

<style scoped>
.comment-header {
  display: flex;
  align-items: center;
  gap: 8px; 
  flex-wrap: wrap; 
}
.comments-section {
  padding: 16px;
  border-radius: 8px;
  margin-top: -20px;
}

.comment-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.comment-item {
  display: flex;
  align-items: flex-start;
  padding: 8px 0;
  border-bottom: 1px solid #ddd;
}

.comment-author-icon {
  border-radius: 50%;
  margin-right: 12px;
  flex-shrink: 0;
}

.comment-content {
  flex: 1;
}

.comment-author {
  font-weight: bold;
  margin-bottom: 4px;
}

.comment-text {
  margin: 4px 0;
  white-space: pre-wrap;
}

.comment-meta {
  font-size: 0.85em;
  color: gray;
  display: flex;
  gap: 8px;
  align-items: center;
}

.comment-date,
.comment-days-ago,
.comment-likes {
  user-select: none;
}

.error-msg {
  color: red;
  margin-top: 12px;
}
</style>
