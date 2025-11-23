const amqp = require('amqplib');

// Use env or fallback to the same default used in consumers
const RABBIT_URL = process.env.RABBITMQ_URL || 'amqps://kjojionw:EF3ykbemEFsNtbElSSIWe60mMc1-rYQM@jaragua.lmq.cloudamqp.com/kjojionw';
const EXCHANGE = 'shopping_events';
const BINDING_KEY = 'list.checkout.#';
const QUEUES = [ 'notification_queue', 'analytics_queue' ];

async function run() {
  try {
    console.log('Connecting to', RABBIT_URL);
    const conn = await amqp.connect(RABBIT_URL);
    const ch = await conn.createChannel();

    await ch.assertExchange(EXCHANGE, 'topic', { durable: true });

    for (const q of QUEUES) {
      await ch.assertQueue(q, { durable: false });
      await ch.bindQueue(q, EXCHANGE, BINDING_KEY);
      console.log(`Bound queue '${q}' to exchange '${EXCHANGE}' with routing '${BINDING_KEY}'`);
    }

    await ch.close();
    await conn.close();
    console.log('Done. Verifique a Management UI para confirmar os bindings.');
    process.exit(0);
  } catch (err) {
    console.error('Error creating bindings:', err);
    process.exit(1);
  }
}

run();
