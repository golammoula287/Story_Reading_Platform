import { connect } from '../db.js';
import { runPublishingJobs } from './jobs.js';
import mongoose from 'mongoose';
await connect();
let stopping = false;
async function tick() {
  try {
    const result = await runPublishingJobs();
    if (result.published || result.freed) console.log('Publishing jobs', result);
  } catch {
    console.error('Publishing job failed; next run will retry.');
  }
  if (!stopping) timer = setTimeout(tick, 15000);
}
let timer: ReturnType<typeof setTimeout>;
await tick();
for (const signal of ['SIGTERM', 'SIGINT'] as const)
  process.on(signal, async () => {
    stopping = true;
    clearTimeout(timer);
    await mongoose.disconnect();
    process.exit(0);
  });
