import { MongoClient } from 'mongodb';
import { config } from './config.js';

let client;
let database;

export async function connectDatabase() {
  client = new MongoClient(config.mongoUri, { maxPoolSize: 100, serverSelectionTimeoutMS: 5000 });
  await client.connect();
  database = client.db(config.mongoDb);

  const collections = new Set((await database.listCollections({}, { nameOnly: true }).toArray()).map(({ name }) => name));
  if (!collections.has('telemetry')) {
    await database.createCollection('telemetry', {
      timeseries: { timeField: 'timestamp', metaField: 'meta', granularity: 'seconds' },
      expireAfterSeconds: 60 * 60 * 24 * 90,
    });
  }
  if (!collections.has('users')) await database.createCollection('users');
  if (!collections.has('rules')) await database.createCollection('rules');
  if (!collections.has('alerts')) await database.createCollection('alerts');

  await database.collection('users').createIndex({ email: 1 }, { unique: true });
  await database.collection('rules').createIndex({ ownerId: 1, updatedAt: -1 });
  await database.collection('alerts').createIndex({ ownerId: 1, timestamp: -1 });
  return database;
}

export function getDb() {
  if (!database) throw new Error('Database has not been connected');
  return database;
}

export async function closeDatabase() {
  await client?.close();
  client = undefined;
  database = undefined;
}
