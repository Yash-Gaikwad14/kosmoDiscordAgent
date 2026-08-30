import { agentStub } from './agent';
import { platformStub } from './platform';

export * from './types';
export * from './agent';
export * from './platform';

async function bootstrap() {
  console.log('Kosmo Discord Agent contract initialized.');
  console.log('Agent stub:', typeof agentStub.processMessage === 'function');
  console.log('Platform stub:', typeof platformStub.start === 'function');
}

if (require.main === module) {
  bootstrap().catch(console.error);
}
