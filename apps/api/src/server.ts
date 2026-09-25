import { connect } from './db.js';
import { createApp } from './app.js';
import { config } from './config.js';
import mongoose from 'mongoose';
await connect();
await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
const server = createApp().listen(config.API_PORT, config.API_HOST, () =>
  console.log(`API ready at http://${config.API_HOST}:${config.API_PORT}`),
);
for (const signal of ['SIGTERM', 'SIGINT'] as const)
  process.on(signal, () => {
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
  });
