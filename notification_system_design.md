# Design flow & explanations - 22MIA1077

# Stage 1

## Goal

Design a notification platform where authenticated students receive updates about placements, events, and results.
c
## Core Actions

1. List notifications for a student
2. Get unread notification count
3. Mark a notification as read
4. Mark all notifications as read
5. Create a notification
6. Send notification to one student, a group, or all students
7. Deliver real-time notification events

## REST API Contract

### List Notifications

`GET /api/students/{studentId}/notifications?status=unread&type=Placement&page=1&limit=20`

Headers:

```json
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```

Response:

```json
{
  "page": 1,
  "limit": 20,
  "total": 100,
  "notifications": [
    {
      "id": "uuid",
      "studentId": 1042,
      "type": "Placement",
      "title": "Placement update",
      "message": "Company hiring update",
      "isRead": false,
      "createdAt": "2026-04-22T17:51:18Z"
    }
  ]
}
```

### Get Unread Count

`GET /api/students/{studentId}/notifications/unread-count`

Response:

```json
{
  "studentId": 1042,
  "unreadCount": 12
}
```

### Mark One Notification as Read

`PATCH /api/students/{studentId}/notifications/{notificationId}/read`

Response:

```json
{
  "notificationId": "uuid",
  "isRead": true,
  "readAt": "2026-04-22T18:00:00Z"
}
```

### Mark All as Read

`PATCH /api/students/{studentId}/notifications/read-all`

Response:

```json
{
  "studentId": 1042,
  "updatedCount": 12
}
```

### Create Notification

`POST /api/notifications`

Request:

```json
{
  "type": "Placement",
  "title": "Placement drive",
  "message": "New hiring drive opened",
  "target": {
    "mode": "all",
    "studentIds": []
  },
  "priority": 3
}
```

Response:

```json
{
  "notificationId": "uuid",
  "status": "accepted"
}
```

## Real-Time Mechanism

Use WebSocket or Server-Sent Events.

Recommended approach:

- Use WebSocket for logged-in web/mobile clients.
- Maintain mapping of `studentId -> active socket connections`.
- When a notification is created, publish a message to a queue.
- Notification workers save delivery records and push events to active sockets.
- If a student is offline, notification remains unread in DB and is shown on next fetch.

# Stage 2

## Recommended Storage

Use PostgreSQL.

Reasons:

- Strong consistency for read/unread state
- Relational joins between students, notifications, and deliveries
- Index support for high-volume notification queries
- Good transaction support for reliable notification creation

## Schema

```sql
CREATE TYPE notification_type AS ENUM ('Event', 'Result', 'Placement');

CREATE TABLE students (
  id BIGINT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  notification_type notification_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  priority INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE student_notifications (
  student_id BIGINT NOT NULL REFERENCES students(id),
  notification_id UUID NOT NULL REFERENCES notifications(id),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMP NULL,
  delivered_at TIMESTAMP NULL,
  PRIMARY KEY (student_id, notification_id)
);
```

## Queries

List unread notifications:

```sql
SELECT n.id, n.notification_type, n.title, n.message, sn.is_read, n.created_at
FROM student_notifications sn
JOIN notifications n ON n.id = sn.notification_id
WHERE sn.student_id = $1 AND sn.is_read = false
ORDER BY n.created_at DESC
LIMIT $2 OFFSET $3;
```

Mark as read:

```sql
UPDATE student_notifications
SET is_read = true, read_at = NOW()
WHERE student_id = $1 AND notification_id = $2;
```

Unread count:

```sql
SELECT COUNT(*)
FROM student_notifications
WHERE student_id = $1 AND is_read = false;
```

Create notification:

```sql
INSERT INTO notifications (id, notification_type, title, message, priority)
VALUES ($1, $2, $3, $4, $5);
```

Bulk assign to students:

```sql
INSERT INTO student_notifications (student_id, notification_id)
SELECT id, $1
FROM students;
```

## Scaling Problems and Solutions

- Large table scans: add composite indexes.
- Slow pagination with high offsets: use cursor-based pagination.
- High write volume for notify-all: use background jobs and batching.
- Real-time fanout pressure: use message broker and worker pool.
- Old data growth: partition tables by month or archive older notifications.

# Stage 3

The query is functionally accurate only if every row in the `notifications` table is already student-specific. In a normalized design, read/unread state belongs in a mapping table such as `student_notifications`, not in the main notification definition table.

Original query:

```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt DESC;
```

## Why It Is Slow

With 50,000 students and 5,000,000 notifications, the database may scan many rows for `studentID` and `isRead`, then sort by `createdAt`. Without the right composite index, this becomes expensive.

## Improved Query

```sql
SELECT n.id, n.notification_type, n.title, n.message, n.created_at
FROM student_notifications sn
JOIN notifications n ON n.id = sn.notification_id
WHERE sn.student_id = 1042
  AND sn.is_read = false
ORDER BY n.created_at DESC
LIMIT 50;
```

## Indexes

```sql
CREATE INDEX idx_student_notifications_unread
ON student_notifications (student_id, is_read, notification_id);

CREATE INDEX idx_notifications_created_at
ON notifications (created_at DESC);
```

If using a denormalized single table:

```sql
CREATE INDEX idx_notifications_student_read_created
ON notifications (studentID, isRead, createdAt DESC);
```

Likely cost improves from scanning `O(N)` rows to index lookup over matching unread rows, approximately `O(log N + K)` where `K` is returned rows.

## Should I Index Every Column?

No. Indexing every column is ineffective because:

- It slows inserts and updates.
- It increases disk usage.
- Many indexes may never be used.
- Low-selectivity columns alone, such as boolean `isRead`, are weak indexes.
- Composite indexes should match real query patterns.

## Students Who Got Placement Notification in Last 7 Days

```sql
SELECT DISTINCT sn.student_id
FROM student_notifications sn
JOIN notifications n ON n.id = sn.notification_id
WHERE n.notification_type = 'Placement'
  AND n.created_at >= NOW() - INTERVAL '7 days';
```

# Stage 4

Fetching notifications from DB on every page load can overload the database.

## Strategy 1: Cache Unread Counts and Recent Notifications

Use Redis for:

- unread count per student
- first page of recent notifications
- priority inbox results

Tradeoff: cache invalidation is required when a notification is read or created.

## Strategy 2: Cursor-Based Pagination

Use `created_at` and `id` as cursor instead of offset.

Tradeoff: slightly more complex API but much faster for deep pagination.

## Strategy 3: Real-Time Push

Use WebSocket or SSE to push new notifications when created.

Tradeoff: requires connection management and retry logic.

## Strategy 4: Read Replicas

Route heavy read traffic to read replicas.

Tradeoff: replication lag may show slightly stale data.

## Strategy 5: Background Fanout

For mass notifications, enqueue work instead of writing everything synchronously in one request.

Tradeoff: eventual delivery instead of immediate blocking response.

# Stage 5

## Shortcomings of Original Pseudocode

```text
for student_id in student_ids:
    send_email(student_id, message)
    save_to_db(student_id, message)
    push_to_app(student_id, message)
```

Problems:

- Sequential processing is slow for 50,000 students.
- One failure can stop or delay the entire loop.
- No retry mechanism.
- No idempotency key, so retries may create duplicates.
- Email API and DB writes are tightly coupled.
- No batching.
- No queue.
- No dead-letter handling.
- No delivery status tracking.

## What If Email Failed for 200 Students?

Store failed delivery attempts with status `FAILED`, reason, and retry count. Retry through a background worker using exponential backoff. After maximum retries, move to a dead-letter queue for manual inspection or delayed retry.

## Should DB Save and Email Send Happen Together?

No. The notification record and intended recipients should be saved first. Email delivery should happen asynchronously. This ensures the system has a durable source of truth even if email or push delivery fails.

## Redesigned Pseudocode

```text
function notify_all(message):
    notification_id = create_notification(message)

    batches = split_students_into_batches(size=1000)

    for batch in batches:
        enqueue("notification_fanout", {
            notification_id: notification_id,
            student_ids: batch
        })

    return {
        status: "accepted",
        notification_id: notification_id
    }

worker notification_fanout(job):
    for student_id in job.student_ids:
        create_student_notification_if_not_exists(student_id, job.notification_id)
        enqueue("email_delivery", {student_id, notification_id})
        enqueue("app_push_delivery", {student_id, notification_id})

worker email_delivery(job):
    try:
        send_email(job.student_id, job.notification_id)
        mark_email_status(job.student_id, job.notification_id, "SENT")
    catch error:
        if retry_count < max_retries:
            retry_with_backoff(job)
        else:
            mark_email_status(job.student_id, job.notification_id, "FAILED")
            move_to_dead_letter_queue(job)

worker app_push_delivery(job):
    try:
        push_to_active_socket(job.student_id, job.notification_id)
        mark_push_status(job.student_id, job.notification_id, "SENT")
    catch error:
        mark_push_status(job.student_id, job.notification_id, "PENDING")
```

# Stage 6

## Priority Inbox Approach

Priority is calculated using:

1. Type weight
   - Placement = highest
   - Result = medium
   - Event = lowest
2. Recency
   - newer notifications score higher within the same category

The implementation is available in:

```text
notification_app_be/src/priorityTop10.js
notification_app_be/src/services/priorityService.js
```

## Maintaining Top 10 Efficiently

For a static list, sort and take top 10. Complexity is `O(n log n)`.

For continuous incoming notifications, maintain a min-heap of size 10:

1. Calculate priority score for each new notification.
2. If heap size is less than 10, insert.
3. If heap size is 10 and the new score is higher than the minimum score, remove minimum and insert new notification.
4. Current top 10 is always available from the heap.

This reduces update cost to `O(log 10)`, which is effectively constant time for each new notification.
