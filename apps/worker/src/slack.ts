import { getEnv } from '@pulsewatch/config';

export interface SlackAlertParams {
  monitorName: string;
  monitorUrl: string;
  action: 'OPENED' | 'REOPENED' | 'RESOLVED';
  statusCode?: number | null;
  errorMessage?: string | null;
  timestamp: string;
}

/**
 * Sends a rich Slack Block Kit notification to the configured global incoming webhook.
 * Returns true if sent successfully, or false if not configured or failed.
 */
export async function sendSlackAlert(params: SlackAlertParams): Promise<boolean> {
  const env = getEnv();
  const webhookUrl = env.SLACK_WEBHOOK_URL;

  if (!webhookUrl || webhookUrl.trim() === '') {
    return false;
  }

  const isResolved = params.action === 'RESOLVED';
  const color = isResolved ? '#2EB67D' : '#E01E5A'; // Green for recovery, Red for outage
  const statusEmoji = isResolved ? '🟢 UP (Recovered)' : '🔴 DOWN (Outage)';
  const titleText = isResolved
    ? `✅ [RESOLVED] Service Restored: ${params.monitorName}`
    : `🚨 [OUTAGE DETECTED] Service Down: ${params.monitorName}`;

  const payload = {
    text: titleText,
    attachments: [
      {
        color,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: titleText,
              emoji: true,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Monitor Name:*\n${params.monitorName}`,
              },
              {
                type: 'mrkdwn',
                text: `*Current Status:*\n${statusEmoji}`,
              },
              {
                type: 'mrkdwn',
                text: `*Target URL:*\n<${params.monitorUrl}|${params.monitorUrl}>`,
              },
              {
                type: 'mrkdwn',
                text: `*HTTP Status Code:*\n${params.statusCode !== undefined && params.statusCode !== null ? params.statusCode : 'N/A'}`,
              },
            ],
          },
          ...(params.errorMessage && !isResolved
            ? [
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: `*Root Cause / Error Message:*\n\`\`\`${params.errorMessage}\`\`\``,
                  },
                },
              ]
            : []),
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `PulseWatch Incident Engine • Event: \`${params.action}\` • Timestamp: ${params.timestamp}`,
              },
            ],
          },
        ],
      },
    ],
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[Slack] Webhook returned HTTP ${response.status}: ${errorBody}`);
      return false;
    }

    console.log(`[Slack] Successfully posted alert for monitor "${params.monitorName}" (${params.action})`);
    return true;
  } catch (err: any) {
    console.error('[Slack] Failed to dispatch webhook alert:', err.message);
    return false;
  }
}
