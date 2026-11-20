import { getEnv } from '@pulsewatch/config';
import { sendSlackAlert } from '../services/worker/src/slack';

async function main() {
  console.log('====================================================');
  console.log('          PULSEWATCH SLACK INTEGRATION TEST         ');
  console.log('====================================================\n');

  const env = getEnv();
  const webhookUrl = env.SLACK_WEBHOOK_URL;

  if (!webhookUrl || webhookUrl.trim() === '') {
    console.log('[Notice] SLACK_WEBHOOK_URL is not set in .env.');
    console.log('[Notice] Testing graceful fallback: sendSlackAlert should return false without error...');
    const result = await sendSlackAlert({
      monitorName: 'Test Mock API',
      monitorUrl: 'https://api.example.com/health',
      action: 'OPENED',
      statusCode: 503,
      errorMessage: 'Service Unavailable',
      timestamp: new Date().toISOString(),
    });
    console.log(`[Result] Graceful fallback returned: ${result} (Expected: false)`);
    console.log('\nTo receive live alerts in your Slack channel:');
    console.log('1. Go to https://api.slack.com/apps -> Create App -> Incoming Webhooks');
    console.log('2. Add a Webhook to your workspace and select a channel');
    console.log('3. Set SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..." in your .env file');
    console.log('====================================================\n');
    return;
  }

  console.log(`[Slack] Found SLACK_WEBHOOK_URL: ${webhookUrl.substring(0, 35)}...`);
  console.log('[Slack] Sending test outage alert...');
  
  const outageResult = await sendSlackAlert({
    monitorName: 'Production Payment API (Test)',
    monitorUrl: 'https://api.yourdomain.com/v1/charge',
    action: 'OPENED',
    statusCode: 500,
    errorMessage: 'Database connection timeout under load test',
    timestamp: new Date().toISOString(),
  });

  console.log(`[Slack] Outage alert sent: ${outageResult}`);

  console.log('[Slack] Sending test recovery alert...');
  const recoveryResult = await sendSlackAlert({
    monitorName: 'Production Payment API (Test)',
    monitorUrl: 'https://api.yourdomain.com/v1/charge',
    action: 'RESOLVED',
    statusCode: 200,
    timestamp: new Date().toISOString(),
  });

  console.log(`[Slack] Recovery alert sent: ${recoveryResult}`);
  console.log('\n[Success] Check your Slack channel to verify the alert cards!');
}

main().catch((err) => {
  console.error('[Error] Slack integration test failed:', err);
  process.exit(1);
});
