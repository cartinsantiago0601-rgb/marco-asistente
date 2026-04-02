import { processMessage } from './agent.js';

async function test() {
  console.log('Enviando mensaje de prueba a MARCO...');
  try {
    const reply = await processMessage('test-debug', 'hola, qué tal');
    console.log('RESPUESTA:', reply);
  } catch (e: any) {
    console.error('ERROR:', e.message);
    console.error('FULL:', e);
  }
  process.exit(0);
}
test();
