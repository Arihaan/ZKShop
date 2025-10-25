import { Router } from 'express';
import { HexString, Web3StatementBuilder, MIN_DATE, getPastDate } from '@concordium/web-sdk';

export const proofRouter = Router();

// Simple non-verifying endpoints for PoC. In production, verify on backend like gallery/compliant examples.

proofRouter.get('/statement/age18', (_req, res) => {
  const statement = new Web3StatementBuilder()
    .addForIdentityCredentials([0, 1, 2, 3, 4, 5], (b) => b.addRange('dob', MIN_DATE, getPastDate(18, 1)))
    .getStatements();
  res.json({ statement });
});

proofRouter.get('/statement/uk', (_req, res) => {
  // Accept both 'GB' (ISO) and 'uk' (as used in some demos) for PoC flexibility.
  const statement = [{
    type: 'AttributeInSet',
    attributeTag: 'nationality',
    set: ['GB', 'uk']
  }];
  res.json({ statement });
});

// Challenge helper (hex 32 bytes)
proofRouter.get('/challenge', (_req, res) => {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  const hex = Buffer.from(buf).toString('hex') as HexString;
  res.json({ challenge: hex });
});


