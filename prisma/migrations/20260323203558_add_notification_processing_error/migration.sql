-- Add processingError to NotificationEvent for persisting structured processing failures (e.g. no_recipients)
ALTER TABLE "NotificationEvent" ADD COLUMN "processingError" TEXT;