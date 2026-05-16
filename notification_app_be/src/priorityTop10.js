require("dotenv").config();
const { getNotifications } = require("./services/evaluationClient");
const { getTopPriorityNotifications } = require("./services/priorityService");
const { appLog } = require("./logger");

async function main() {
  await appLog("info", "service", "priority top 10 script started");

  const notifications = await getNotifications();
  const top10 = getTopPriorityNotifications(notifications, 10);

  await appLog("info", "service", `priority top 10 calculated from ${notifications.length} notifications`);

  process.stdout.write(JSON.stringify({
    count: top10.length,
    notifications: top10
  }, null, 2));
}

main().catch(async (error) => {
  await appLog("fatal", "handler", `priority top 10 script failed: ${error.message}`);
  process.exitCode = 1;
});
