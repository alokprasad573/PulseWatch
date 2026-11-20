import { prisma, disconnectPrisma } from './index';

async function main() {
  console.log('[Database] Applying custom PostgreSQL partial indexes...');

  try {
    // 1. Partial unique index: At most ONE active (OPEN or RECOVERING) incident per monitor
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_active_incident_per_monitor
      ON incidents (monitor_id)
      WHERE status IN ('OPEN', 'RECOVERING');
    `);
    console.log('[Database] Successfully created/verified idx_active_incident_per_monitor');

    // 2. Partial index on due monitors
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_monitors_due
      ON monitors (next_check_at)
      WHERE enabled = true;
    `);
    console.log('[Database] Successfully created/verified idx_monitors_due');

    // 3. Partial index on pending outbox events
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_outbox_pending_events
      ON outbox_events (status, available_at)
      WHERE status = 'PENDING';
    `);
    console.log('[Database] Successfully created/verified idx_outbox_pending_events');

    console.log('[Database] All custom PostgreSQL constraints and partial indexes applied.');
  } catch (error: any) {
    console.error('[Database] Failed to apply custom indexes:', error.message);
  } finally {
    await disconnectPrisma();
  }
}

main();
