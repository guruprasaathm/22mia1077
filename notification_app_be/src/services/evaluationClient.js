const { appLog } = require("../logger");

const DEFAULT_BASE_URL = "http://4.224.186.213/evaluation-service";

async function getNotifications() {
  const baseUrl = process.env.EVALUATION_BASE_URL || DEFAULT_BASE_URL;
  const token = process.env.ACCESS_TOKEN;

  if (!token) {
    await appLog("fatal", "config", "ACCESS_TOKEN missing while fetching notifications");
    throw new Error("ACCESS_TOKEN is missing");
  }

  await appLog("debug", "service", "fetching notifications from evaluation service");

  const response = await fetch(`${baseUrl}/notifications`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    await appLog("error", "service", `notifications API failed with status ${response.status}`);
    throw new Error(`Notifications API failed: ${response.status}`);
  }

  await appLog("info", "service", `received ${Array.isArray(data.notifications) ? data.notifications.length : 0} notifications`);
  return Array.isArray(data.notifications) ? data.notifications : [];
}

module.exports = {
  getNotifications
};
