const amqp = require('amqplib');

// Default to provided CloudAMQP instance if RABBITMQ_URL not set
const RABBIT_URL = process.env.RABBITMQ_URL || 'amqps://kjojionw:EF3ykbemEFsNtbElSSIWe60mMc1-rYQM@jaragua.lmq.cloudamqp.com/kjojionw';
const EXCHANGE = 'shopping_events';
const BINDING_KEY = 'list.checkout.#';
const QUEUE_NAME = 'analytics_queue';

async function start() {
    try {
        const conn = await amqp.connect(RABBIT_URL);
        const ch = await conn.createChannel();
        await ch.assertExchange(EXCHANGE, 'topic', { durable: true });
        await ch.assertQueue(QUEUE_NAME, { durable: false });
        await ch.bindQueue(QUEUE_NAME, EXCHANGE, BINDING_KEY);

        console.log(`📊 Analytics Consumer listening on ${EXCHANGE} (${BINDING_KEY})`);

        ch.consume(QUEUE_NAME, msg => {
            if (!msg) return;
            try {
                const event = JSON.parse(msg.content.toString());
                const listId = event.data && event.data.listId;
                let total = 0;
                if (event.data && event.data.summary && typeof event.data.summary.estimatedTotal === 'number') {
                    total = event.data.summary.estimatedTotal;
                } else if (event.data && Array.isArray(event.data.items)) {
                    total = event.data.items.reduce((acc, it) => acc + ((it.quantity || 0) * (it.estimatedPrice || 0)), 0);
                }
                console.log(`Analytics: Lista ${listId} total gasto R$${total.toFixed(2)}`);
                ch.ack(msg);
            } catch (err) {
                console.error('Erro ao processar mensagem de analytics:', err);
                ch.nack(msg, false, false);
            }
        });

        process.on('SIGINT', async () => {
            console.log('📊 Analytics Consumer shutting down...');
            await ch.close();
            await conn.close();
            process.exit(0);
        });

    } catch (err) {
        console.error('❌ Analytics Consumer error:', err);
        process.exit(1);
    }
}

start();
