import { getStore } from '@netlify/blobs';
import { createHandler } from '../../server/core.mjs';
import { scannerFromEnv } from '../../server/scan/index.mjs';
import seed from '../../server/seed.mjs';
import bootstrap from '../../server/owner-bootstrap.mjs';
export default createHandler({getStore,seed,bootstrap,scan:scannerFromEnv()});
