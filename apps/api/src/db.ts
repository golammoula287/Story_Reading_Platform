import mongoose from 'mongoose';
import { config } from './config.js';
export async function connect(uri = config.MONGODB_URI) {
  // All request filters are built explicitly from validated scalar inputs.
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
}
