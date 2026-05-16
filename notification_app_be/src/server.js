require("dotenv").config();
const app = require("./app");
const { appLog } = require("./logger");

const PORT = Number(process.env.PORT) || 3002;

app.listen(PORT, async () => {
  await appLog("info", "config", `notification service started on port ${PORT}`);
});
