import { WorkBuffer } from '../index.js';
import { MessageHandler } from '../handlers/MessageHandler.js';
import { SocketEmissionHandler } from '../handlers/SocketEmissionHandler.js';

class EmailHandler extends MessageHandler {
  constructor() {
    super('email', { timeout: 10000, idempotent: true, maxRetries: 3 });
  }

  async validate(payload) {
    if (!payload.to || !payload.subject || !payload.body) {
      throw new Error('Email payload must include to, subject, and body');
    }
    return true;
  }

  async process(message) {
    const { to, subject } = message.payload;
    console.log(`Sending email to ${to}: ${subject}`);
    await new Promise((resolve) => setTimeout(resolve, 100));
    return { sent: true, messageId: message.messageId, timestamp: new Date() };
  }
}

async function main() {
  const workBuffer = new WorkBuffer({
    config: { concurrency: 5, maxRetries: 5, maxQueueSize: 1000, metricsEnabled: true },
  });

  workBuffer.registerHandler(new EmailHandler());
  workBuffer.registerHandler(new SocketEmissionHandler());

  workBuffer.on('completed', ({ messageId, type, processingTime }) => {
    console.log(`Completed: ${messageId} (${type}) in ${processingTime}ms`);
  });

  await workBuffer.start();
  console.log('WorkBuffer started');

  await workBuffer.enqueue({
    type: 'email',
    payload: { to: 'user@example.com', subject: 'Welcome!', body: 'Welcome to our service' },
    priority: 'HIGH',
  });

  process.on('SIGINT', async () => {
    console.log('Shutting down...');
    await workBuffer.stop({ drain: true });
    process.exit(0);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default main;
