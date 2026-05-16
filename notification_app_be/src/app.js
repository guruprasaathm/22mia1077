const express = require("express");
const cors = require("cors");
const { appLog } = require("./logger");
const { getNotifications } = require("./services/evaluationClient");
const { getTopPriorityNotifications } = require("./services/priorityService");

const app = express();

app.use(cors());
app.use(express.json());

app.use(async (req, res, next) => {
  await appLog("info", "middleware", `${req.method} ${req.originalUrl} request received`);
  next();
});

app.get("/health", async (req, res) => {
  await appLog("debug", "route", "notification health check requested");
  res.status(200).json({
    status: "ok",
    service: "notification_app_be"
  });
});

app.get("/api/notifications/priority", async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 10;
    const notifications = await getNotifications();
    const topNotifications = getTopPriorityNotifications(notifications, limit);

    await appLog("info", "controller", `returned top ${topNotifications.length} priority notifications`);

    res.status(200).json({
      limit,
      totalFetched: notifications.length,
      count: topNotifications.length,
      notifications: topNotifications
    });
  } catch (error) {
    next(error);
  }
});

app.use(async (error, req, res, _next) => {
  await appLog("error", "handler", `request failed at ${req.method} ${req.originalUrl}: ${error.message}`);
  res.status(500).json({
    message: "Internal server error",
    detail: error.message
  });
});

module.exports = app;
