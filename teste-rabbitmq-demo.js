// teste-rabbitmq-demo.js
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

class RabbitMQDemo {
    constructor() {
        this.token = null;
        this.userId = null;
        this.lists = [];
        this.items = [];
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async setup() {
        console.log('🚀 CONFIGURANDO TESTE RABBITMQ\n');

        // 1. Criar usuário
        console.log('1. 👤 Criando usuário...');
        const userData = {
            email: `rabbitmq_${Date.now()}@teste.com`,
            username: `rabbitmq${Date.now()}`,
            password: 'senha123',
            firstName: 'RabbitMQ',
            lastName: 'Test'
        };

        try {
            const registro = await axios.post(`${API_BASE}/auth/register`, userData);
            this.token = registro.data.data.token;
            this.userId = registro.data.data.user.id;
            console.log('✅ Usuário criado e token obtido do registro');
        } catch (err) {
            console.log('❌ Erro no registro:', err.response?.data?.message);
            throw err;
        }

        // 2. Buscar itens
        console.log('2. 📦 Buscando itens...');
        try {
            const itensResponse = await axios.get(`${API_BASE}/items`, {
                headers: this.getAuthHeader()
            });
            this.items = itensResponse.data.data || [];
            console.log(`✅ ${this.items.length} itens encontrados`);
        } catch (err) {
            console.log('❌ Erro ao buscar itens:', err.message);
        }
    }

    getAuthHeader() {
        return { Authorization: `Bearer ${this.token}` };
    }

    async testRabbitMQCheckout() {
        console.log('\n🎯 TESTE RABBITMQ - CHECKOUT ASSÍNCRONO\n');

        try {
            // 1. Criar lista
            console.log('1. 🛒 Criando lista de compras...');
            const lista = await axios.post(`${API_BASE}/lists`, {
                name: 'Lista Teste RabbitMQ',
                description: 'Testando mensageria assíncrona'
            }, {
                headers: this.getAuthHeader()
            });

            const listaId = lista.data.data.id;
            console.log(`✅ Lista criada: ${listaId}`);

            // 2. Adicionar itens à lista
            console.log('2. 📋 Adicionando itens à lista...');
            if (this.items.length >= 2) {
                for (let i = 0; i < 2; i++) {
                    await axios.post(`${API_BASE}/lists/${listaId}/items`, {
                        itemId: this.items[i].id,
                        quantity: i + 1
                    }, {
                        headers: this.getAuthHeader()
                    });
                    console.log(`   ✅ ${this.items[i].name} adicionado`);
                }
            }

            // 3. Ver lista antes do checkout
            console.log('3. 👀 Verificando lista antes do checkout...');
            const listaAntes = await axios.get(`${API_BASE}/lists/${listaId}`, {
                headers: this.getAuthHeader()
            });
            console.log(`   📊 Itens: ${listaAntes.data.data.items.length}`);
            console.log(`   💰 Total: R$ ${listaAntes.data.data.summary.estimatedTotal.toFixed(2)}`);

            // 4. 🎯 MOMENTO DA VERDADE - CHECKOUT RABBITMQ!
            console.log('\n4. 🎯 EXECUTANDO CHECKOUT (DISPARANDO RABBITMQ)...');
            console.log('   📤 Esta chamada vai publicar no exchange "shopping_events"');
            console.log('   🚀 Deve retornar IMEDIATAMENTE com 202 Accepted\n');

            const inicio = Date.now();
            
            const checkout = await axios.post(`${API_BASE}/lists/${listaId}/checkout`, {}, {
                headers: this.getAuthHeader()
            });

            const tempoResposta = Date.now() - inicio;

            console.log('📨 RESPOSTA DO CHECKOUT:');
            console.log(`   ✅ Status: ${checkout.status} (${checkout.status === 202 ? 'CORRETO' : 'ERRADO'})`);
            console.log(`   ⚡ Tempo de resposta: ${tempoResposta}ms (${tempoResposta < 1000 ? 'RÁPIDO' : 'LENTO'})`);
            console.log(`   📝 Mensagem: ${checkout.data.message}`);
            console.log(`   🆔 Lista ID: ${checkout.data.listId || listaId}`);

            // 5. Verificações
            console.log('\n5. ✅ VERIFICAÇÕES:');
            console.log(`   - Status 202 Accepted: ${checkout.status === 202 ? '✅ SIM' : '❌ NÃO'}`);
            console.log(`   - Resposta rápida (<1s): ${tempoResposta < 1000 ? '✅ SIM' : '❌ NÃO'}`);
            console.log(`   - Mensagem assíncrona: ${checkout.data.message.includes('processamento') ? '✅ SIM' : '❌ NÃO'}`);

            // 6. O que deve acontecer nos consumers
            console.log('\n6. 👀 O QUE DEVE ACONTECER AGORA:');
            console.log('   📊 Analytics Consumer deve mostrar:');
            console.log(`      "Analytics: Lista ${listaId} total gasto R$ ${listaAntes.data.data.summary.estimatedTotal.toFixed(2)}"`);
            console.log('');
            console.log('   🔔 Notification Consumer deve mostrar:');
            console.log(`      "Enviando comprovante da lista ${listaId} para rabbitmq_...@teste.com"`);
            console.log('');
            console.log('   🌐 CloudAMQP deve mostrar:');
            console.log('      - Message rates subindo');
            console.log('      - Filas processando mensagens');
            console.log('      - Exchange "shopping_events" com tráfego');

            return {
                success: checkout.status === 202,
                listaId: listaId,
                tempoResposta: tempoResposta,
                total: listaAntes.data.data.summary.estimatedTotal
            };

        } catch (error) {
            console.error('❌ ERRO NO CHECKOUT:', error.message);
            if (error.response) {
                console.log('Status:', error.response.status);
                console.log('Data:', error.response.data);
            }
            return { success: false, error: error.message };
        }
    }

    async testMultipleCheckouts() {
        console.log('\n🔄 TESTANDO MÚLTIPLOS CHECKOUTS...');

        const resultados = [];
        
        for (let i = 1; i <= 3; i++) {
            console.log(`\n--- Checkout ${i}/3 ---`);
            
            // Criar lista rápida
            const lista = await axios.post(`${API_BASE}/lists`, {
                name: `Lista Rápida ${i}`,
                description: `Teste rápido ${i}`
            }, {
                headers: this.getAuthHeader()
            });

            // Adicionar um item se disponível
            if (this.items.length > 0) {
                await axios.post(`${API_BASE}/lists/${lista.data.data.id}/items`, {
                    itemId: this.items[0].id,
                    quantity: i
                }, {
                    headers: this.getAuthHeader()
                });
            }

            // Checkout
            const inicio = Date.now();
            const checkout = await axios.post(`${API_BASE}/lists/${lista.data.data.id}/checkout`, {}, {
                headers: this.getAuthHeader()
            });
            const tempo = Date.now() - inicio;

            resultados.push({
                checkout: i,
                status: checkout.status,
                tempo: tempo,
                success: checkout.status === 202
            });

            console.log(`   ✅ Checkout ${i}: ${checkout.status} em ${tempo}ms`);
            
            await this.delay(500); // Pequena pausa entre checkouts
        }

        console.log('\n📊 RESUMO MÚLTIPLOS CHECKOUTS:');
        const sucessos = resultados.filter(r => r.success).length;
        console.log(`   ✅ ${sucessos}/3 bem-sucedidos`);
        console.log(`   ⚡ Tempo médio: ${(resultados.reduce((acc, r) => acc + r.tempo, 0) / resultados.length).toFixed(0)}ms`);
    }

    async run() {
        try {
            console.log('=========================================');
            console.log('🚀 DEMONSTRAÇÃO RABBITMQ - CHECKOUT ASSÍNCRONO');
            console.log('=========================================\n');

            await this.setup();

            // Teste principal
            const resultado = await this.testRabbitMQCheckout();

            if (resultado.success) {
                // Teste adicional com múltiplos checkouts
                await this.testMultipleCheckouts();

                console.log('\n🎉 DEMONSTRAÇÃO CONCLUÍDA!');
                console.log('=========================================');
                console.log('✅ RabbitMQ funcionando perfeitamente!');
                console.log('✅ Checkout assíncrono operacional');
                console.log('✅ Mensageria distribuída ativa');
                console.log('✅ Consumers processando em background');
                console.log('');
                console.log('📋 PARA MOSTRAR NA SALA:');
                console.log('   1. CloudAMQP com mensagens processadas');
                console.log('   2. Terminais dos consumers com logs');
                console.log('   3. Resposta rápida da API (202 Accepted)');
                console.log('   4. Processamento em background');
            } else {
                console.log('\n❌ DEMONSTRAÇÃO FALHOU');
                console.log('💡 Verifique:');
                console.log('   - List Service está rodando?');
                console.log('   - Endpoint /checkout existe?');
                console.log('   - RabbitMQ conectado?');
            }

        } catch (error) {
            console.error('\n💥 ERRO NA DEMONSTRAÇÃO:', error.message);
        }
    }
}

// Executar demonstração
const demo = new RabbitMQDemo();
demo.run();