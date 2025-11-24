// teste.js
const amqp = require('amqplib');
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';
const RABBIT_URL = 'amqps://kjojionw:EF3ykbemEFsNtbElSSIWe60mMc1-rYQM@jaragua.lmq.cloudamqp.com/kjojionw';

async function testarSistemaCompleto() {
    console.log('INICIANDO TESTE COMPLETO DO SISTEMA');
    console.log('====================================\n');

    let token = null;
    let userId = null;

    try {
        // 1. REGISTRAR USUARIO
        console.log('1. Registrando novo usuario...');
        const userData = {
            email: `teste_${Date.now()}@email.com`,
            username: `usuario${Date.now()}`,
            password: 'senha123',
            firstName: 'Usuario',
            lastName: 'Teste'
        };

        const registro = await axios.post(`${API_BASE}/auth/register`, userData);
        token = registro.data.data.token;
        userId = registro.data.data.user.id;
        console.log('Usuario registrado: ' + userData.email);
        console.log('Token obtido com sucesso\n');

        // 2. VALIDAR TOKEN
        console.log('2. Validando token...');
        const validacao = await axios.post(`${API_BASE}/auth/validate`, {
            token: token
        });
        console.log('Token validado: ' + validacao.data.data.user.email + '\n');

        // 3. BUSCAR ITENS
        console.log('3. Buscando itens disponiveis...');
        const itensResponse = await axios.get(`${API_BASE}/items`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const items = itensResponse.data.data || [];
        console.log(items.length + ' itens encontrados no catalogo\n');

        // 4. CRIAR LISTA DE COMPRAS
        console.log('4. Criando lista de compras...');
        const listaResponse = await axios.post(`${API_BASE}/lists`, {
            name: 'Minha Lista de Compras',
            description: 'Lista criada para teste do RabbitMQ'
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const listaId = listaResponse.data.data.id;
        console.log('Lista criada: ' + listaId + '\n');

        // 5. ADICIONAR ITENS A LISTA
        console.log('5. Adicionando itens a lista...');
        if (items.length >= 3) {
            for (let i = 0; i < 3; i++) {
                await axios.post(`${API_BASE}/lists/${listaId}/items`, {
                    itemId: items[i].id,
                    quantity: i + 1
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                console.log(' - ' + items[i].name + ' adicionado');
            }
        }
        console.log('');

        // 6. VERIFICAR LISTA ANTES DO CHECKOUT
        console.log('6. Verificando lista antes do checkout...');
        const listaDetalhes = await axios.get(`${API_BASE}/lists/${listaId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const lista = listaDetalhes.data.data;
        console.log('Itens na lista: ' + lista.items.length);
        console.log('Total estimado: R$ ' + lista.summary.estimatedTotal.toFixed(2) + '\n');

        // 7. EXECUTAR CHECKOUT (RABBITMQ)
        console.log('7. Executando checkout...');
        console.log('Esta acao vai publicar mensagem no RabbitMQ/LavinMQ');
        console.log('Exchange: shopping_events');
        console.log('Routing Key: list.checkout.completed\n');

        const inicioCheckout = Date.now();
        const checkoutResponse = await axios.post(`${API_BASE}/lists/${listaId}/checkout`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const tempoCheckout = Date.now() - inicioCheckout;

        console.log('RESPOSTA DO CHECKOUT:');
        console.log('Status: ' + checkoutResponse.status + ' (' + (checkoutResponse.status === 202 ? 'SUCESSO' : 'ERRO') + ')');
        console.log('Tempo de resposta: ' + tempoCheckout + 'ms');
        console.log('Mensagem: ' + checkoutResponse.data.message);
        console.log('');

        // 8. TESTE ADICIONAL: ENVIAR MENSAGEM DIRETA
        console.log('8. Teste adicional: enviando mensagem direta...');
        const conn = await amqp.connect(RABBIT_URL);
        const channel = await conn.createChannel();
        
        const mensagemTeste = {
            data: {
                listId: 'teste-direto-' + Date.now(),
                userEmail: userData.email,
                summary: { estimatedTotal: 99.99 },
                items: [
                    { itemName: 'Produto Teste', quantity: 2, estimatedPrice: 25.50 }
                ]
            }
        };

        await channel.publish('shopping_events', 'list.checkout.completed', 
            Buffer.from(JSON.stringify(mensagemTeste))
        );
        
        console.log('Mensagem de teste enviada diretamente para o RabbitMQ');
        
        await channel.close();
        await conn.close();

        // 9. RESUMO FINAL
        console.log('\n====================================');
        console.log('TESTE CONCLUIDO COM SUCESSO!');
        console.log('====================================');
        console.log('Usuario: ' + userData.email);
        console.log('Lista criada: ' + listaId);
        console.log('Checkout realizado: ' + checkoutResponse.status);
        console.log('Mensagens enviadas para RabbitMQ: 2');
        console.log('');
        console.log('VERIFICAR NOS CONSUMERS:');
        console.log('1. Analytics: Lista ' + listaId + ' total gasto R$ ' + lista.summary.estimatedTotal.toFixed(2));
        console.log('2. Notification: Enviando comprovante para ' + userData.email);
        console.log('3. CloudAMQP/LavinMQ com mensagens nas filas');

    } catch (error) {
        console.error('ERRO NO TESTE: ' + error.message);
        if (error.response) {
            console.log('Status: ' + error.response.status);
            console.log('Erro: ' + JSON.stringify(error.response.data));
        }
    }
}

testarSistemaCompleto();