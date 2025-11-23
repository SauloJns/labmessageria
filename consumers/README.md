# Consumers (RabbitMQ)

Two simple Node.js consumers for the "Finalização de Compra" demo.

- `notification-consumer.js` — listens to `list.checkout.#` and logs a notification message.
- `analytics-consumer.js` — listens to `list.checkout.#` and computes total spent.

Quick start (Powershell):

```powershell
# from repo root
cd consumers
npm install
# in two different shells:
node notification-consumer.js
# and
node analytics-consumer.js
```

Environment variable:
- `RABBITMQ_URL` (optional). Default: `amqp://localhost`.

Nota: para testes com a instância fornecida, você pode usar a URL AMQPS abaixo (já definida como default no código se `RABBITMQ_URL` não for informado):

```
amqps://kjojionw:EF3ykbemEFsNtbElSSIWe60mMc1-rYQM@jaragua.lmq.cloudamqp.com/kjojionw
```

Exemplo (PowerShell) para iniciar consumers apontando explicitamente para essa instância:

```powershell
cd "c:\Users\bebes\OneDrive\Área de Trabalho\aaaa\trabalho_lab\consumers"
$env:RABBITMQ_URL='amqps://kjojionw:EF3ykbemEFsNtbElSSIWe60mMc1-rYQM@jaragua.lmq.cloudamqp.com/kjojionw'
npm install
npm run start:all
```

Tip: to run RabbitMQ quickly (if you have Docker):

```powershell
docker run -d --rm --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
```

Then call the List Service checkout endpoint to see messages flow.
