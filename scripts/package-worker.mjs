import { loadAndParseConfig } from '@cloudflare/config';
import {
  cleanBuildOutputDir,
  writeAssets,
  writeRootConfig,
  writeWorkerConfig,
  readBuildOutput,
} from '@cloudflare/build-output-utils';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..'),
  context = { isPreview: false };
const parsed = await loadAndParseConfig(resolve(root, 'cloudflare.config.ts'), context);
if (!parsed.result.success) throw new Error(JSON.stringify(parsed.result));
const config = parsed.result.data;
await cleanBuildOutputDir(root);
await writeRootConfig(root, { accountId: config.accountId }, context);
await writeAssets({ root, sourceDirectory: resolve(root, 'dist') });
await writeWorkerConfig({ root, config: config.worker });
await readBuildOutput(root);
console.log('Static assets ready for cf deploy --prebuilt.');
