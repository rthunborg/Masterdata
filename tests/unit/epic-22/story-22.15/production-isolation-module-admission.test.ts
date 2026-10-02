import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('protected isolation Node module admission', () => {
  it.each(['allowed', 'modified', 'esm-escape', 'cjs-escape'] as const)('enforces held import hashes for %s', variant => {
    const root=mkdtempSync(path.join(tmpdir(),'hr-isolation-module-'));
    try {
      const release=path.join(root,'src/lib/release'); mkdirSync(release,{recursive:true});
      for(const name of ['production-isolation-module-register.mjs','production-isolation-module-loader.mjs'])writeFileSync(path.join(release,name),readFileSync(path.resolve('src/lib/release',name)));
      const entry=path.join(root,'entry.mjs'),child=path.join(root,'child.cjs'),escape=path.join(root,'unleased.cjs');
      writeFileSync(escape,"console.log('unleased-executed');module.exports=1;");
      writeFileSync(child,variant==='cjs-escape'?"module.exports=require('./unleased.cjs');":"module.exports=1;");
      writeFileSync(entry,variant==='esm-escape'?"import './unleased.cjs';":"import fs from 'node:fs';import value from './child.cjs';console.log(value===1&&typeof fs.readFileSync==='function'?'allowed':'bad');");
      const files=[entry,child].map(file=>({path:file,sha256:createHash('sha256').update(readFileSync(file)).digest('hex')}));
      writeFileSync(path.join(root,'module-lease.json'),JSON.stringify({schemaVersion:1,kind:'protected-production-isolation-module-lease',files}));
      if(variant==='modified')writeFileSync(child,"console.log('modified-executed');module.exports=1;");
      const env={...process.env};delete env.NODE_OPTIONS;delete env.NODE_PATH;
      const result=spawnSync(process.execPath,['--no-addons','--no-global-search-paths','--import',pathToFileURL(path.join(release,'production-isolation-module-register.mjs')).href,entry],{env,encoding:'utf8',windowsHide:true,timeout:10_000});
      expect(result.error).toBeUndefined();
      if(variant==='allowed'){expect(result.status).toBe(0);expect(result.stdout.trim()).toBe('allowed');expect(result.stderr).toBe('');}
      else{expect(result.status).not.toBe(0);expect(result.stdout).toBe('');expect(result.stderr).toContain('Protected production isolation module admission refused');}
    }finally{rmSync(root,{recursive:true,force:true});}
  });
});
