const cron = require("node-cron");
const Blog = require("../models/Blog");

function startScheduler() {
  // Run every minute to check for posts that need to be published
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();
      const scheduledPosts = await Blog.find({
        status: "scheduled",
        scheduledAt: { $lte: now },
      });

      if (scheduledPosts.length === 0) return;

      for (const post of scheduledPosts) {
        post.status = "published";
        post.publishedAt = post.scheduledAt;
        await post.save();
      }

      console.log(`[Scheduler] Auto-published ${scheduledPosts.length} scheduled post(s)`);
    } catch (err) {
      console.error("[Scheduler] Error publishing scheduled posts:", err.message);
    }
  });

  console.log("[Scheduler] Blog scheduling cron job started (runs every minute)");
}

module.exports = { startScheduler };
