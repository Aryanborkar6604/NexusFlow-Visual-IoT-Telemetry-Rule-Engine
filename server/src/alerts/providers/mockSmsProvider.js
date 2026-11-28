
export async function sendMockSms({ recipient, message, value }) {
  if (!recipient || !message) {
    throw new Error('Recipient and message are required');
  }

  const messageId = `mock_sms_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 7)}`;

  const timestamp = new Date().toISOString();

  console.log('\n======================================================');
  console.log('[MOCK SMS DISPATCHED]');
  console.log(`Message ID : ${messageId}`);
  console.log(`Recipient  : ${recipient}`);
  console.log(`Message    : ${message}`);
  console.log(`Value      : ${value ?? 'N/A'}`);
  console.log(`Timestamp  : ${timestamp}`);
  console.log('======================================================\n');

  return {
    success: true,
    messageId,
    provider: 'mock',
    recipient,
    timestamp,
  };
}
