const amqp = require('amqplib');

// Default to provided CloudAMQP instance if RABBITMQ_URL not set
const RABBIT_URL = 'amqps://kjojionw:EF3ykbemEFsNtbElSSIWe60mMc1-rYQM@jaragua.lmq.cloudamqp.com/kjojionw';const EXCHANGE = 'shopping_events';
const BINDING_KEY = 'list.checkout.#';
const QUEUE_NAME = 'notification_queue';

async function start() {
    try {
        const conn = await amqp.connect(RABBIT_URL);
        const ch = await conn.createChannel();
        await ch.assertExchange(EXCHANGE, 'topic', { durable: true });
        await ch.assertQueue(QUEUE_NAME, { durable: false });
        await ch.bindQueue(QUEUE_NAME, EXCHANGE, BINDING_KEY);

        console.log(`🔔 Notification Consumer listening on ${EXCHANGE} (${BINDING_KEY})`);

        ch.consume(QUEUE_NAME, msg => {
            if (!msg) return;
            try {
                const event = JSON.parse(msg.content.toString());
                const listId = event.data && event.data.listId;
                const email = event.data && event.data.userEmail;
                console.log(`Enviando comprovante da lista ${listId} para o usuário ${email}`);
                ch.ack(msg);
            } catch (err) {
                console.error('Erro ao processar mensagem de notificação:', err);
                ch.nack(msg, false, false);
            }
        });

        process.on('SIGINT', async () => {
            console.log('🔔 Notification Consumer shutting down...');
            await ch.close();
            await conn.close();
            process.exit(0);
        });

    } catch (err) {
        console.error('❌ Notification Consumer error:', err);
        process.exit(1);
    }
}

start();
