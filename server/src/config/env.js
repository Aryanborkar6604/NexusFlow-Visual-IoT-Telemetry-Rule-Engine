import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || 5000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/nexusflow',
  JWT_SECRET: process.env.JWT_SECRET || 'nexusflow_default_secret_key_2026',
  USE_TWILIO: process.env.USE_TWILIO === 'true',
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || '',
  DEFAULT_FACTORY_ID: process.env.DEFAULT_FACTORY_ID || 'FACTORY_01',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173'
};
