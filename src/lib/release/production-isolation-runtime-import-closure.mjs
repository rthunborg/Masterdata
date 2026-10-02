import ts from 'typescript';
import {builtinModules,createRequire} from 'node:module';
import {readFileSync,realpathSync} from 'node:fs';
import path from 'node:path';

const fail=()=>{throw new Error('Protected production isolation runtime import closure refused');};
const builtins=new Set(builtinModules.flatMap(name=>[name,'node:'+name]));

/** Offline graph proof: package test files stay leased, but are not executable roots. */
export function verifyIsolationRuntimeImportClosure(root,packages,files){
  if(ts.version!=='5.9.3')fail();
  const admitted=new Set(files.map(file=>path.resolve(root,file.path)));
  const roots=new Map();
  for(const item of packages){const json=JSON.parse(readFileSync(path.resolve(root,item.packagePath),'utf8'));roots.set(item.name,{directory:path.dirname(path.resolve(root,item.packagePath)),json});}
  const pending=[];
  for(const {directory,json} of roots.values())for(const key of ['main','module'])if(typeof json[key]==='string')pending.push(path.resolve(directory,json[key]));
  const visited=new Set();
  while(pending.length){const file=pending.pop();if(visited.has(file))continue;if(!admitted.has(file)||realpathSync(file)!==file)fail();visited.add(file);
    const owner=[...roots].find(([,item])=>file.startsWith(item.directory+path.sep));if(!owner)fail();
    const source=ts.createSourceFile(file,readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
    if(source.parseDiagnostics.length)fail();
    const imports=[];
    function visit(node){
      if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier){if(!ts.isStringLiteral(node.moduleSpecifier))fail();imports.push(node.moduleSpecifier.text);}
      if(ts.isCallExpression(node)&&(node.expression.kind===ts.SyntaxKind.ImportKeyword||(ts.isIdentifier(node.expression)&&node.expression.text==='require'))){if(node.arguments.length!==1||!ts.isStringLiteral(node.arguments[0]))fail();imports.push(node.arguments[0].text);}
      ts.forEachChild(node,visit);
    }visit(source);
    for(const name of imports){
      if(builtins.has(name))continue;
      if(owner[0]==='ws'&&['bufferutil','utf-8-validate'].includes(name))continue; // Host disables both optional native paths.
      let target;
      if(name.startsWith('.')){try{target=createRequire(file).resolve(name);}catch{fail();}}
      else{const matched=[...roots.keys()].find(n=>name===n||name.startsWith(n+'/'));if(!matched)fail();
        if(name===matched){const item=roots.get(matched);target=path.resolve(item.directory,item.json.module??item.json.main);}
        else{try{target=createRequire(file).resolve(name);}catch{fail();}}
        // Check actual CommonJS package resolution too; it may not escape its admitted package.
        try{const resolved=createRequire(file).resolve(name);if(!admitted.has(resolved)||!resolved.startsWith(roots.get(matched).directory+path.sep))fail();}catch{fail();}
      }
      if(!admitted.has(target))fail();pending.push(target);
    }
  }
  return Object.freeze({reachableModuleCount:visited.size,allPackageFilesLeased:true});
}
