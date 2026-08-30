import { kosmoAgent } from './agent';
import { platform } from './platform';

export * from './types';
export * from './agent';
export * from './platform';

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