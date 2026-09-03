require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User"); // Path assuming script is in backend/scripts

mongoose.connect(process.env.MONGO_URI || "mongodb+srv://danish0007865:Q1n0oXF6r2y7aFmC@ds2025.w9nmy.mongodb.net/blogds?retryWrites=true&w=majority&appName=DS2025").then(async () => {
  const users = await User.find({});
  for (const user of users) {
    if (!user.authorSlug) {
      user.markModified('name'); // force the hook
      await user.save();
      console.log(`Updated user ${user.name} with slug ${user.authorSlug}`);
    }
  }
  console.log("Migration complete");
  process.exit(0);
});
