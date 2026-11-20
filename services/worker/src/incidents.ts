import { prisma } from '@pulsewatch/database';
import { IncidentEventType, IncidentStatus } from '@pulsewatch/shared';

export interface IncidentTransitionResult {
  incidentId?: string;
  eventType?: IncidentEventType;
  action: 'NONE' | 'OPENED' | 'RECOVERING' | 'REOPENED' | 'RESOLVED';
  monitorName?: string;
  monitorUrl?: string;
}

/**
 * Evaluates consecutive check history and transitions incident state according to the state machine.
 * Executed inside a transactional boundary.
 */
export async function evaluateIncidentState(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  params: {
    monitorId: string;
    isSuccess: boolean;
    failureThreshold: number;
    recoveryThreshold: number;
    errorMessage?: string | null;
    statusCode?: number | null;
  }
): Promise<IncidentTransitionResult> {
  const { monitorId, isSuccess, failureThreshold, recoveryThreshold, errorMessage, statusCode } = params;

  // Retrieve the monitor details
  const monitor = await tx.monitor.findUnique({
    where: { id: monitorId },
    select: { id: true, name: true, url: true, status: true },
  });

  if (!monitor) return { action: 'NONE' };

  // Check for any currently active incident (OPEN or RECOVERING)
  const activeIncident = await tx.incident.findFirst({
    where: {
      monitorId,
      status: { in: [IncidentStatus.OPEN, IncidentStatus.RECOVERING] },
    },
    orderBy: { startedAt: 'desc' },
  });

  // Query recent checks to determine consecutive count
  const recentChecks = await tx.monitorCheck.findMany({
    where: { monitorId },
    orderBy: { checkedAt: 'desc' },
    take: Math.max(failureThreshold, recoveryThreshold) + 1,
  });

  if (!isSuccess) {
    // Check is a failure
    if (!activeIncident) {
      // Count consecutive failures
      let consecutiveFailures = 0;
      for (const check of recentChecks) {
        if (!check.isSuccess) {
          consecutiveFailures++;
        } else {
          break;
        }
      }

      if (consecutiveFailures >= failureThreshold) {
        // Open a new incident!
        const incident = await tx.incident.create({
          data: {
            monitorId,
            title: `Outage detected for ${monitor.name}`,
            description: errorMessage ?? `Failed with HTTP status ${statusCode ?? 'unknown'}`,
            status: IncidentStatus.OPEN,
            startedAt: new Date(),
          },
        });

        await tx.incidentEvent.create({
          data: {
            incidentId: incident.id,
            eventType: IncidentEventType.INCIDENT_OPENED,
            message: `Service failed ${consecutiveFailures} consecutive health checks. Reason: ${errorMessage ?? 'Unknown'}`,
            metadata: { statusCode, errorMessage, consecutiveFailures },
          },
        });

        await tx.outboxEvent.create({
          data: {
            aggregateType: 'INCIDENT',
            aggregateId: incident.id,
            eventType: IncidentEventType.INCIDENT_OPENED,
            payload: {
              incidentId: incident.id,
              monitorId,
              monitorName: monitor.name,
              monitorUrl: monitor.url,
              eventType: IncidentEventType.INCIDENT_OPENED,
              message: `Service outage detected: ${errorMessage ?? 'Unresponsive'}`,
              timestamp: new Date().toISOString(),
            },
            status: 'PENDING',
          },
        });

        await tx.monitor.update({
          where: { id: monitorId },
          data: { status: 'DOWN' },
        });

        return {
          incidentId: incident.id,
          eventType: IncidentEventType.INCIDENT_OPENED,
          action: 'OPENED',
          monitorName: monitor.name,
          monitorUrl: monitor.url,
        };
      }
    } else if (activeIncident.status === IncidentStatus.RECOVERING) {
      // Failure occurred during recovery -> revert back to OPEN
      await tx.incident.update({
        where: { id: activeIncident.id },
        data: { status: IncidentStatus.OPEN },
      });

      await tx.incidentEvent.create({
        data: {
          incidentId: activeIncident.id,
          eventType: IncidentEventType.INCIDENT_REOPENED,
          message: `Check failed during recovery period. Reopening outage. Reason: ${errorMessage ?? 'Unknown'}`,
          metadata: { statusCode, errorMessage },
        },
      });

      await tx.outboxEvent.create({
        data: {
          aggregateType: 'INCIDENT',
          aggregateId: activeIncident.id,
          eventType: IncidentEventType.INCIDENT_REOPENED,
          payload: {
            incidentId: activeIncident.id,
            monitorId,
            monitorName: monitor.name,
            monitorUrl: monitor.url,
            eventType: IncidentEventType.INCIDENT_REOPENED,
            message: `Outage reopened during recovery check`,
            timestamp: new Date().toISOString(),
          },
          status: 'PENDING',
        },
      });

      await tx.monitor.update({
        where: { id: monitorId },
        data: { status: 'DOWN' },
      });

      return {
        incidentId: activeIncident.id,
        eventType: IncidentEventType.INCIDENT_REOPENED,
        action: 'REOPENED',
        monitorName: monitor.name,
        monitorUrl: monitor.url,
      };
    }
  } else {
    // Check is a success
    if (activeIncident) {
      if (activeIncident.status === IncidentStatus.OPEN) {
        // First success -> transition to RECOVERING
        await tx.incident.update({
          where: { id: activeIncident.id },
          data: { status: IncidentStatus.RECOVERING },
        });

        await tx.incidentEvent.create({
          data: {
            incidentId: activeIncident.id,
            eventType: IncidentEventType.RECOVERY_STARTED,
            message: 'First successful check received. Monitoring recovery stability.',
            metadata: { statusCode },
          },
        });

        await tx.outboxEvent.create({
          data: {
            aggregateType: 'INCIDENT',
            aggregateId: activeIncident.id,
            eventType: IncidentEventType.RECOVERY_STARTED,
            payload: {
              incidentId: activeIncident.id,
              monitorId,
              monitorName: monitor.name,
              monitorUrl: monitor.url,
              eventType: IncidentEventType.RECOVERY_STARTED,
              message: 'First successful response received. Outage recovery started.',
              timestamp: new Date().toISOString(),
            },
            status: 'PENDING',
          },
        });

        return {
          incidentId: activeIncident.id,
          eventType: IncidentEventType.RECOVERY_STARTED,
          action: 'RECOVERING',
          monitorName: monitor.name,
          monitorUrl: monitor.url,
        };
      } else if (activeIncident.status === IncidentStatus.RECOVERING) {
        // Count consecutive successes
        let consecutiveSuccesses = 0;
        for (const check of recentChecks) {
          if (check.isSuccess) {
            consecutiveSuccesses++;
          } else {
            break;
          }
        }

        if (consecutiveSuccesses >= recoveryThreshold) {
          // Resolve incident!
          const now = new Date();
          await tx.incident.update({
            where: { id: activeIncident.id },
            data: {
              status: IncidentStatus.RESOLVED,
              resolvedAt: now,
            },
          });

          await tx.incidentEvent.create({
            data: {
              incidentId: activeIncident.id,
              eventType: IncidentEventType.INCIDENT_RESOLVED,
              message: `Service resolved after ${consecutiveSuccesses} consecutive successful checks.`,
              metadata: { statusCode, consecutiveSuccesses },
            },
          });

          await tx.outboxEvent.create({
            data: {
              aggregateType: 'INCIDENT',
              aggregateId: activeIncident.id,
              eventType: IncidentEventType.INCIDENT_RESOLVED,
              payload: {
                incidentId: activeIncident.id,
                monitorId,
                monitorName: monitor.name,
                monitorUrl: monitor.url,
                eventType: IncidentEventType.INCIDENT_RESOLVED,
                message: `Service restored and incident resolved`,
                timestamp: now.toISOString(),
              },
              status: 'PENDING',
            },
          });

          await tx.monitor.update({
            where: { id: monitorId },
            data: { status: 'UP' },
          });

          return {
            incidentId: activeIncident.id,
            eventType: IncidentEventType.INCIDENT_RESOLVED,
            action: 'RESOLVED',
            monitorName: monitor.name,
            monitorUrl: monitor.url,
          };
        }
      }
    } else {
      // No active incident, normal UP status
      if (monitor.status !== 'UP') {
        await tx.monitor.update({
          where: { id: monitorId },
          data: { status: 'UP' },
        });
      }
    }
  }

  return { action: 'NONE' };
}
