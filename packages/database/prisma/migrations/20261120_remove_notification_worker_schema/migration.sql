-- Migration: 20261120_remove_notification_worker_schema
-- Description: Drop orphaned tables, relations, constraints, indexes, and enums associated with the removed notification-worker service.

-- 1. Drop Foreign Key Constraints
ALTER TABLE IF EXISTS "notification_deliveries" DROP CONSTRAINT IF EXISTS "notification_deliveries_incident_id_fkey";
ALTER TABLE IF EXISTS "notification_deliveries" DROP CONSTRAINT IF EXISTS "notification_deliveries_channel_id_fkey";
ALTER TABLE IF EXISTS "notification_channels" DROP CONSTRAINT IF EXISTS "notification_channels_user_id_fkey";

-- 2. Drop Tables (along with their indexes and unique constraints)
DROP TABLE IF EXISTS "notification_deliveries";
DROP TABLE IF EXISTS "notification_channels";

-- 3. Drop Enums
DROP TYPE IF EXISTS "NotificationStatus";
DROP TYPE IF EXISTS "NotificationType";

-- Rollback instructions:
-- To rollback, re-apply the previous schema definitions or execute:
-- CREATE TYPE "NotificationType" AS ENUM ('EMAIL', 'SLACK');
-- CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED');
-- CREATE TABLE "notification_channels" (...);
-- CREATE TABLE "notification_deliveries" (...);
