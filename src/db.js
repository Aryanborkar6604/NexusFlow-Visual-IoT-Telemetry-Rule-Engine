import { MongoClient } from 'mongodb';
import { config } from './config.js';

let client;
let db;

export async function connectDatabase() {
  client = new MongoClient(config.mongoUri, { maxPoolSize: 100, retryWrites: true });
  await client.connect();
  db = client.db(config.mongoDb);

  const collections = await db.listCollections({ name: 'telemetry' }).toArray();
  if (collections.length === 0) {
    await db.createCollection('telemetry', {
      timeseries: { timeField: 'timestamp', metaField: 'meta', granularity: 'seconds' },
      expireAfterSeconds: 60 * 60 * 24 * 90,
    });
  }
  await db.collection('telemetry').createIndex({ 'meta.sensorId': 1, timestamp: -1 });
  await db.collection('rules').createIndex({ updatedAt: -1 });
  return db;
}

export function getDb() {
  if (!db) throw new Error('Database is not connected');
  return db;
}

export async function closeDatabase() {
  await client?.close();
}
