import { spawn } from 'node:child_process';
import { mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
const dir = path.resolve('.local/mongo');
await mkdir(dir, { recursive: true });
const windowsPath = 'C:/Program Files/MongoDB/Server/7.0/bin/mongod.exe';
let binary = process.env.MONGOD_BINARY || 'mongod';
if (process.platform === 'win32' && !process.env.MONGOD_BINARY) {
  try {
    await access(windowsPath);
    binary = windowsPath;
  } catch {}
}
const child = spawn(
  binary,
  [
    '--dbpath',
    dir,
    '--port',
    '27018',
    '--bind_ip',
    '127.0.0.1',
    '--replSet',
    'storyhaven',
    '--logpath',
    path.join(dir, 'mongod.log'),
  ],
  { windowsHide: true, stdio: 'inherit' },
);
child.on('error', (err) => {
  console.error('Could not start MongoDB:', err.message);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  if (code) console.error('MongoDB exited. Check .local/mongo/mongod.log and port 27018.');
  process.exitCode = code || 0;
});
for (let i = 0; i < 30; i++) {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27018/admin?directConnection=true', {
      serverSelectionTimeoutMS: 1000,
    });
    try {
      await mongoose.connection.db.admin().command({ replSetGetStatus: 1 });
    } catch (e) {
      if (e.code !== 94) throw e;
      await mongoose.connection.db
        .admin()
        .command({
          replSetInitiate: { _id: 'storyhaven', members: [{ _id: 0, host: '127.0.0.1:27018' }] },
        });
    }
    await mongoose.disconnect();
    console.log(
      'Local MongoDB running at 127.0.0.1:27018 (replica set: storyhaven). Keep this terminal open.',
    );
    break;
  } catch {
    await mongoose.disconnect();
    if (i === 29) {
      child.kill();
      throw new Error('MongoDB did not become ready.');
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill());
