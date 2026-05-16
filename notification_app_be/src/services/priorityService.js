const TYPE_WEIGHT = {
  Placement: 3,
  Result: 2,
  Event: 1
};

function parseTimestamp(value) {
  return new Date(value.replace(" ", "T")).getTime();
}

function scoreNotification(notification, newestTime) {
  const weightScore = (TYPE_WEIGHT[notification.Type] || 0) * 1_000_000;
  const timestamp = parseTimestamp(notification.Timestamp);
  const recencyScore = Number.isFinite(timestamp) ? Math.max(0, timestamp - newestTime + 1_000_000) : 0;

  return weightScore + recencyScore;
}

function getTopPriorityNotifications(notifications, limit = 10) {
  const safeLimit = Math.max(1, Number(limit) || 10);
  const newestTime = notifications.reduce((max, notification) => {
    const timestamp = parseTimestamp(notification.Timestamp);
    return Number.isFinite(timestamp) ? Math.max(max, timestamp) : max;
  }, 0);

  return notifications
    .map((notification) => ({
      ...notification,
      PriorityScore: scoreNotification(notification, newestTime)
    }))
    .sort((a, b) => {
      if (b.PriorityScore !== a.PriorityScore) return b.PriorityScore - a.PriorityScore;
      return parseTimestamp(b.Timestamp) - parseTimestamp(a.Timestamp);
    })
    .slice(0, safeLimit);
}

module.exports = {
  getTopPriorityNotifications
};
