import mongoose from 'mongoose';
import { config } from './config.js';
let pending: Promise<typeof mongoose> | undefined;
export async function connect(uri = config.MONGODB_URI) {
  if (mongoose.connection.readyState === 1) return;
  // All request filters are built explicitly from validated scalar inputs.
  pending ??= mongoose.connect(uri, { serverSelectionTimeoutMS: 10000, maxPoolSize: 10 });
  try {
    await pending;
  } finally {
    pending = undefined;
  }
}
