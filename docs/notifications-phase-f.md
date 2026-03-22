# Phase F: Message Batching / Anti-Spam

## 1. Recommended Batching Strategy

**Thread-aware throttle + digest**

- **Throttle window**: 5 minutes. If we sent an email for (userId, conversationId) in the last 5 min, skip immediate send and record for digest.
- **Digest delay**: 2 minutes after last message. Cron runs every 3 min; processes pending digests where lastTriggeredAt is older than 2 min.
- **In-app**: Unchanged. Immediate per message.
- **Email only**: Batching applies only to the EMAIL channel.

**Flow**

1. Message sent → `message.received` event created and processed.
2. **IN_APP**: Delivered immediately (unchanged).
3. **EMAIL**: Check throttle. If we sent an email for this conversation to this user in the last 5 min:
   - Skip send. Create delivery with status SKIPPED ("batched (digest pending)").
   - Upsert `MessageDigestPending` for (userId, conversationId).
4. If not throttled: clear any pending digest, send email as usual.
5. **Digest cron** (every 3 min): For each pending digest older than 2 min:
   - Get unread count for that user in that conversation.
   - If unreadCount > 0 and user has email enabled: send one digest email ("You have N new messages from [Sender]").
   - Create `NotificationEvent` (message.digest), `NotificationDelivery`, `EmailLog` for observability.
   - Delete from `MessageDigestPending` after processing (recovery retries FAILED deliveries).

---

## 2. Files Added / Changed

| File | Change |
|------|--------|
| `prisma/schema.prisma` | `MessageDigestPending` model |
| `prisma/migrations/20260324100000_add_message_digest_pending/migration.sql` | New migration |
| `lib/notifications/types.ts` | `message.digest` event type |
| `lib/notifications/events.ts` | `message.digest` config + `collectRecipientIds` |
| `lib/notifications/message-batching.ts` | **New**. Throttle, digest, `processMessageDigests` |
| `lib/notifications/processor.ts` | Throttle check for `message.received` EMAIL |
| `lib/notifications/templates/index.ts` | `message.digest` template |
| `lib/notifications/channels/in-app.ts` | `message.digest` in `EVENT_TO_LEGACY_TYPE` |
| `lib/inngest/functions/notifications.ts` | `messageDigestFn` cron |
| `app/api/inngest/route.ts` | Register `messageDigestFn` |
| `docs/notifications-phase-f.md` | This doc |

---

## 3. Implementation Summary

### 3.1 MessageDigestPending

- `userId`, `conversationId` (composite PK)
- `lastTriggeredAt` – last message that triggered throttle
- `createdAt`

### 3.2 Throttle

- `shouldThrottleMessageEmail(userId, conversationId)` – true if a SENT email exists for that (user, conversation) in the last 5 min.
- `recordDigestPending` / `clearDigestPending` – upsert/delete in `MessageDigestPending`.

### 3.3 Processor

- For `message.received` + EMAIL: throttle check before send.
- If throttled: create SKIPPED delivery, `recordDigestPending`, return.
- If not throttled: `clearDigestPending`, then send as usual.

### 3.4 Digest

- Cron every 3 min.
- Process up to 50 pending digests per run.
- Idempotency per digest via `idempotencyKey` = `message.digest-${userId}-${conversationId}-${lastTriggeredAt.getTime()}`.

---

## 4. Manual Test Steps

1. **First message – immediate email**
   - Send one message in a conversation.
   - Verify: recipient gets one email right away.

2. **Rapid messages – throttled, then digest**
   - Send several messages within ~1 min.
   - Verify: first message → immediate email; later ones → no new emails.
   - Wait ~3–5 min for digest cron.
   - Verify: one digest email, e.g. "You have 3 new messages from [Sender]".

3. **After throttle window**
   - Send a message, wait for immediate email.
   - Wait 6+ minutes.
   - Send another message.
   - Verify: second message triggers an immediate email (throttle window expired).

4. **User read messages before digest**
   - Send messages (throttled).
   - Recipient reads all messages in the UI.
   - Digest cron runs.
   - Verify: no digest email (unreadCount = 0).

5. **Email preference off**
   - Turn off message email in notification preferences.
   - Send messages (throttled).
   - Digest cron runs.
   - Verify: no digest email.

6. **In-app unchanged**
   - Send messages.
   - Verify: in-app notifications still arrive immediately for each message.

---

## 5. Edge Cases and Handling

| Edge case | Handling |
|-----------|----------|
| First message in conversation | No prior email → not throttled → immediate send. |
| Messages every 4 min | Each outside throttle window → separate emails (acceptable). |
| User reads all before digest | Digest checks unreadCount; skips if 0. |
| User disables message email | Digest checks preferences; skips if disabled. |
| Digest cron overlap | `concurrency: { limit: 1 }` on digest function. |
| Multiple conversations | Throttle is per (userId, conversationId). |
| Concurrent digests for same row | Idempotency key uses `lastTriggeredAt`; we delete after processing. |
| Conversation deleted | `sendOneDigest` returns false if conversation not found; pending row still deleted. |
| User deleted | `sendOneDigest` returns false if no user/email; pending row still deleted. |
| Digest send fails | `NotificationDelivery` marked FAILED; recovery can retry. Pending row is deleted (we don’t re-queue to avoid loops). |
| No unread messages at digest time | Skip send, delete pending. |

**Note on digest failure**: If the digest email fails, we do not delete the pending row. The next cron run will retry. Recovery also retries FAILED deliveries.
