import { connect } from '../db.js';
import { User } from '../models.js';
import { hashPassword } from '../lib.js';
import { registerSchema } from '@storyhaven/contracts';
import mongoose from 'mongoose';
const input = registerSchema.parse({
  name: process.env.ADMIN_NAME,
  email: process.env.ADMIN_EMAIL,
  password: process.env.ADMIN_PASSWORD,
});
await connect();
await User.init();
try {
  if (await User.exists({ email: input.email }))
    throw new Error('Account already exists; administrator creation does not overwrite accounts.');
  await User.create({
    name: input.name,
    email: input.email,
    passwordHash: await hashPassword(input.password),
    role: 'admin',
  });
  console.log('Administrator created. Remove the provisioning password from your environment.');
} finally {
  await mongoose.disconnect();
}
