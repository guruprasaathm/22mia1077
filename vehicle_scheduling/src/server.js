require("dotenv").config();
const app = require("./app");
const { appLog } = require("./logger");

const PORT = Number(process.env.PORT) || 3001;

app.listen(PORT, async () => {
  await appLog("info", "config", `vehicle scheduling service started on port ${PORT}`);
});
