import { randomBytes } from 'node:crypto';
import { generateKey } from '../src/license-key.ts';
console.log(
  generateKey(randomBytes(2).toString('hex').toUpperCase(), randomBytes(2).toString('hex').toUpperCase()),
);
