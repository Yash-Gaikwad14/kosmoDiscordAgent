import 'dotenv/config';
import { kosmoAgent } from './agent';
import { platform } from './platform';


export * from './types';
export * from './agent';
export * from './platform';
export * from './services/discord/types';
export * from './services/discord/nl_manager';
export * from './services/discord/plan';
export * from './services/discord/permissionValidator';
export * from './services/discord/policy';
export * from './commands/kosmo/manage';

async function bootstrap() {
  console.log('Kosmo Discord Agent starting...');
  console.log('Agent implementation:', typeof kosmoAgent.processMessage === 'function');

  await platform.start();

  console.log('Kosmo Discord Agent is now running.');
}

if (require.main === module) {
  bootstrap().catch((err) => {
    console.error('Fatal error during bootstrap:', err);
    process.exit(1);
  });
}