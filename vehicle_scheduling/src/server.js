require("dotenv").config();
const app = require("./app");
const { appLog } = require("./logger");

const PORT = Number(process.env.PORT) || 3001;

app.listen(PORT, async () => {
  await appLog("info", "config", `vehicle scheduling service started on port ${PORT}`);
});

app.get("/api/logging-demo", async (req, res) => {
  await appLog(
    "backend",
    "info",
    "handler",
    "logging middleware demo endpoint was triggered successfully"
  );

  return res.status(200).json({
    success: true,
    message: "Logging middleware demo completed"
  });
});

app.get("/api/logging-demo/full", async (req, res) => {
  await appLog("backend", "debug", "handler", "logging demo started");
  await appLog("backend", "info", "service", "sample service operation completed");
  await appLog("backend", "warn", "controller", "sample warning generated for demo");

  return res.status(200).json({
    success: true,
    message: "Multiple logging calls completed (debug, info & warn to server)",
    logsTriggered: 3
  });
});
