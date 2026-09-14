import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const runtime = resolve(root, '.sites-runtime');
mkdirSync(runtime, {recursive:true});
const varsPath = resolve(root, '.dev.vars');
let vars = existsSync(varsPath) ? readFileSync(varsPath, 'utf8') : '# Local development secrets. Never commit this file.\n';
const secretLine = /^KEY_ENCRYPTION_SECRET\s*=\s*(.*)$/m;
const match = vars.match(secretLine);
if (!match || /^(?:""|'')?$/.test(match[1].trim())) {
  const entry = `KEY_ENCRYPTION_SECRET=${randomBytes(32).toString('hex')}`;
  vars = match ? vars.replace(secretLine, entry) : vars + '\n' + entry + '\n';
  writeFileSync(varsPath, vars, {mode:0o600});
}

// Explicitly local placeholder resources, sharing the Vite persistence directory.
const configPath = resolve(runtime, 'local-wrangler.json');
writeFileSync(configPath, JSON.stringify({
  name:'scene-sketch-local', compatibility_date:'2026-09-01',
  d1_databases:[{binding:'DB',database_name:'site-creator-d1',database_id:'00000000-0000-4000-8000-000000000000',migrations_dir:resolve(root,'drizzle')}],
}));
const result = spawnSync(process.execPath, [resolve(root,'node_modules/wrangler/bin/wrangler.js'),
  'd1','migrations','apply','DB','--local','--config',configPath,'--persist-to',resolve(root,'.wrangler/state')],
  {cwd:root,stdio:['ignore','inherit','inherit'],env:{...process.env,WRANGLER_SEND_METRICS:'false',WRANGLER_LOG_PATH:resolve(root,'.wrangler/logs')}});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);
console.log('Local workspace ready. No ChatGPT sign-in required.');
