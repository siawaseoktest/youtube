<template>
  <section class="comments-section">
    <h2 v-if="totalCommentCount !== null">{{ totalCommentCount }}</h2>

    <!-- ローディング表示 -->
    <p v-if="loading">コメントを読み込み中...</p>

    <!-- コメントリスト -->
    <ul v-else-if="comments.length > 0" class="comment-list">
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
          <div class="comment-header">
            <div class="comment-author">{{ c.author }}</div>
            <span class="comment-meta comment-date">{{ c.date }}</span>
          </div>

          <!-- コメントテキスト -->
          <div
            class="comment-text"
            :class="{ clamped: c.isClamped && !c.isExpanded, expanded: c.isExpanded }"
            :data-index="i"
          >
            {{ c.text }}
          </div>

          <!-- もっと見る / 閉じるボタン -->
          <button
            v-if="c.isClamped"
            @click="toggleExpand(i)"
            class="read-more-btn"
            type="button"
          >
            {{ c.isExpanded ? "閉じる" : "もっと見る" }}
          </button>

          <div class="comment-meta">
            <span class="comment-likes">👍 {{ c.likes }}</span>
          </div>
        </div>
      </li>
    </ul>

    <p v-else-if="!error">コメントが見つかりません。</p>
    <p v-if="error" class="error-msg">⚠️ {{ error }}<br />
      <button @click="fetchComments" class="retry-btn" type="button">再取得</button>
    </p>
  </section>
</template>

<script>
import { apiurl } from "@/api";

export default {
  name: "Comment",
  props: {
    videoId: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      comments: [],
      totalCommentCount: null,
      error: null,
      loading: false,
    };
  },
  watch: {
    videoId: {
      immediate: true,
      handler() {
        this.fetchComments();
      },
    },
  },
  mounted() {
    this.$nextTick(() => {
      this.checkCommentsHeight();
    });
  },
  updated() {
    this.$nextTick(() => {
      this.checkCommentsHeight();
    });
  },
  methods: {
    async fetchComments() {
      this.error = null;
      this.comments = [];
      this.totalCommentCount = null;
      this.loading = true;

      try {
        const res = await fetch(`${apiurl()}?comments=${this.videoId}`);

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();

        this.totalCommentCount = data.totalCommentCount ?? null;

        if (Array.isArray(data.comments)) {
          this.comments = data.comments.map((c, index) => ({
            id: c.id || index,
            author: c.author || "匿名",
            authorIcon: c.authorIcon || null,
            text: c.text || "",
            date: c.date || "",
            likes: c.likes ?? 0,
            isExpanded: false,
            isClamped: false,
          }));
        } else {
          this.comments = [];
        }
      } catch (err) {
        console.error("コメント取得エラー:", err);
        this.error = "コメントを読み込めませんでした。";
      } finally {
        this.loading = false;
      }
    },

    checkCommentsHeight() {
      const commentTextElements = this.$el.querySelectorAll(".comment-text");

      commentTextElements.forEach((el) => {
        const index = Number(el.dataset.index);
        if (index === undefined || !this.comments[index]) return;

        const height = el.scrollHeight;

        this.comments[index].isClamped = height > 250;

        if (!this.comments[index].isExpanded && height <= 250) {
          this.comments[index].isClamped = false;
        }
      });
    },

    toggleExpand(index) {
      const comment = this.comments[index];
      comment.isExpanded = !comment.isExpanded;

      if (!comment.isExpanded) {
        this.$nextTick(() => {
          const commentItems = this.$el.querySelectorAll(".comment-item");
          const el = commentItems[index];
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        });
      }
    },
  },
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
  border-bottom: 1px solid #dddddd71;
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
  max-width: 100%;
  white-space: pre-wrap;
  word-break: break-word;
  position: relative;
}

.comment-text.clamped {
  max-height: 250px;
  overflow: hidden;
}

/* 展開状態：高さ制限解除 */
.comment-text.expanded {
  max-height: none;
  overflow: visible;
}

.read-more-btn {
  background: none;
  border: none;
  color: #007bff;
  cursor: pointer;
  font-size: 0.9em;
  margin-top: 4px;
  padding: 0;
  user-select: none;
}

.read-more-btn:hover {
  text-decoration: underline;
}

.comment-meta {
  font-size: 0.85em;
  color: gray;
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 4px;
}

.comment-likes{
  margin-top: 6px;
}

.comment-date,
.comment-likes {
  user-select: none;
}

.error-msg {
  color: red;
  margin-top: 12px;
}
</style>
