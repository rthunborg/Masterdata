import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const fail=()=>{throw new Error('Protected production isolation module admission refused');};
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const bytes=readFileSync(path.join(root,'module-lease.json'));
if(bytes.length>262144)fail();
const inventory=JSON.parse(bytes.toString('utf8'));
if(inventory?.schemaVersion!==1||inventory.kind!=='protected-production-isolation-module-lease'||
  Object.keys(inventory).sort().join(',')!=='files,kind,schemaVersion'||!Array.isArray(inventory.files)||
  inventory.files.length===0||inventory.files.length>1024)fail();
const files=new Map();
for(const entry of inventory.files){if(!entry||Object.keys(entry).sort().join(',')!=='path,sha256'||
  typeof entry.path!=='string'||!path.isAbsolute(entry.path)||!/^([a-f0-9]{64})$/.test(entry.sha256)||files.has(entry.path))fail();files.set(entry.path,entry.sha256);}

/** Fixed installed hook rejects shadow packages and imports outside held source/runtime leases. */
export function resolve(specifier,context,nextResolve){
  const result=nextResolve(specifier,context);
  if(result.url.startsWith('node:'))return result;
  if(!result.url.startsWith('file:'))fail();
  const file=fileURLToPath(result.url),expected=files.get(file);
  if(!expected||createHash('sha256').update(readFileSync(file)).digest('hex')!==expected)fail();
  return result;
}
