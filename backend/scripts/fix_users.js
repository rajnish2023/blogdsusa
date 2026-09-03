require("dotenv").config();
const mongoose = require("mongoose");

async function fix() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const users = db.collection("users");

  // Fix 1: Activate ALL users (migration stored status as string "1" not int 1)
  const res1 = await users.updateMany({}, {
    $set: { status: "active", failedLoginAttempts: 0, lockUntil: null }
  });
  console.log("Users activated:", res1.modifiedCount);

  // Fix 2: Replace PHP bcrypt prefix $2y$ -> $2b$ so Node bcryptjs can verify hashes
  const allUsers = await users.find({}).toArray();
  let fixedPasswords = 0;
  for (const u of allUsers) {
    if (u.password && u.password.startsWith("$2y$")) {
      const fixedHash = u.password.replace("$2y$", "$2b$");
      await users.updateOne({ _id: u._id }, { $set: { password: fixedHash } });
      fixedPasswords++;
    }
  }
  console.log("Password hashes fixed ($2y -> $2b):", fixedPasswords);

  // Verify admin user
  const adminUser = await users.findOne({ email: "admin@admin.com" });
  console.log("\nAdmin user after fix:");
  console.log("  Email  :", adminUser.email);
  console.log("  Status :", adminUser.status);
  console.log("  PwdHash:", adminUser.password.substring(0, 10), "...");

  // Show all users final state
  console.log("\n=== All users (final) ===");
  const finalUsers = await users.find({}).toArray();
  finalUsers.forEach(u => {
    console.log(`  [${u.status}] ${u.name} <${u.email}> pwd:${u.password ? u.password.substring(0, 6) : "MISSING"}`);
  });

  await mongoose.disconnect();
  console.log("\nFix complete.");
}

fix().catch(console.error);
