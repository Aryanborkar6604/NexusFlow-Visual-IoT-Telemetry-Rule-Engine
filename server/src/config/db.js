import mongoose from 'mongoose';
import { ENV } from './env.js';

let isConnected = false;

export async function connectDB() {
  try {
    const conn = await mongoose.connect(ENV.MONGODB_URI, {
      serverSelectionTimeoutMS: 2500,
    });
    isConnected = true;
    console.log(`[MongoDB Atlas] Successfully connected to host: ${conn.connection.host} (Database: ${conn.connection.name})`);
  } catch (err) {
    isConnected = false;
    console.warn(`[MongoDB] Warning: Database connection failed (${err.message}). In-memory RxJS stream pipeline will continue operating.`);
  }
}

export function isDbConnected() {
  return isConnected;
}
