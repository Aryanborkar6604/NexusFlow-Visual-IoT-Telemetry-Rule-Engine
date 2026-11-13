export async function sendMockSms({ recipient, message, value }) {
  const messageId = `mock_sms_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  console.log(`\n======================================================`);
  console.log(`[MOCK SMS DISPATCHED]`);
  console.log(`Message ID : ${messageId}`);
  console.log(`Recipient  : ${recipient}`);
  console.log(`Message    : ${message}`);
  console.log(`Value      : ${value}`);
  console.log(`Timestamp  : ${new Date().toISOString()}`);
  console.log(`======================================================\n`);

  return {
    success: true,
    messageId,
    provider: 'mock',
  };
}
