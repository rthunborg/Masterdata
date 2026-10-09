import { registerHooks } from 'node:module';
import { resolve } from './production-isolation-module-loader.mjs';
registerHooks({ resolve });
