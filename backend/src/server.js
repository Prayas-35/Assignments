const { app } = require("./app.js");
const { env, db } = require("./config");

const PORT = env.PORT;

db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false")
  .then(() => {
    console.log("Database schema checked/updated.");
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Database schema update failed:", err);
    process.exit(1);
  });
