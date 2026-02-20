const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;
const WEBHOOK_URL = process.env.WEBHOOK_URL || ''; // Opcional: webhook para debug

// Configuração do cliente WhatsApp
const client = new Client({
    authStrategy: new LocalAuth(), // Mantém a sessão salva
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Evento: QR Code gerado (escaneie com seu WhatsApp)
client.on('qr', (qr) => {
    console.log('📱 ESCANEIE ESTE QR CODE COM SEU WHATSAPP:');
    qrcode.generate(qr, { small: true });
});

// Evento: Cliente pronto
client.on('ready', () => {
    console.log('✅ WhatsApp conectado e pronto!');
    console.log('📊 Servidor rodando na porta:', PORT);
});

// Evento: Mensagem recebida (opcional - para debug)
client.on('message', async (msg) => {
    if (msg.body.toLowerCase() === '!ping') {
        await msg.reply('pong');
    }
    
    // Se quiser encaminhar para webhook
    if (WEBHOOK_URL && !msg.fromMe) {
        try {
            await axios.post(WEBHOOK_URL, {
                from: msg.from,
                body: msg.body,
                timestamp: msg.timestamp
            });
        } catch (error) {
            console.error('Erro ao enviar para webhook:', error);
        }
    }
});

// Inicializa o cliente
client.initialize();

// ============ API ENDPOINTS ============

// Endpoint para enviar mensagem (seu script do Google Sheets vai chamar aqui)
app.post('/send-message', async (req, res) => {
    try {
        const { numero, mensagem } = req.body;
        
        // Formata o número (remove caracteres especiais)
        let numeroFormatado = numero.replace(/\D/g, '');
        
        // Adiciona código do país se não tiver
        if (!numeroFormatado.startsWith('55')) {
            numeroFormatado = '55' + numeroFormatado;
        }
        
        // Formato final: 5511999999999@c.us
        const chatId = `${numeroFormatado}@c.us`;
        
        console.log(`📨 Enviando para ${chatId}: ${mensagem}`);
        
        await client.sendMessage(chatId, mensagem);
        
        res.json({ 
            success: true, 
            message: 'Mensagem enviada com sucesso!' 
        });
        
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Endpoint para verificar status
app.get('/status', (req, res) => {
    const info = client.info;
    res.json({
        connected: !!info,
        number: info ? info.wid.user : null,
        pushname: info ? info.pushname : null
    });
});

// Endpoint para receber alertas do Google Sheets
app.post('/alerta-bitcoin', async (req, res) => {
    try {
        const { 
            sinal, 
            preco_usd, 
            preco_brl, 
            cotacao, 
            indice_medo,
            variacao_24h,
            interpretacao 
        } = req.body;
        
        // Seu número do WhatsApp (coloque seu número aqui)
        const SEU_NUMERO = '5511999999999'; // 🔴 SUBSTITUA PELO SEU NÚMERO
        
        // Monta mensagem personalizada
        let mensagem = `🚨 *ALERTA BITCOIN* 🚨\n\n`;
        mensagem += `📊 *Sinal:* ${sinal}\n`;
        mensagem += `💰 *Preço:* R$ ${parseFloat(preco_brl).toFixed(2)} ($${parseFloat(preco_usd).toFixed(2)})\n`;
        mensagem += `💵 *Dólar:* R$ ${parseFloat(cotacao).toFixed(2)}\n`;
        mensagem += `📈 *Variação 24h:* ${variacao_24h}%\n`;
        mensagem += `😨 *Índice Medo:* ${indice_medo}\n`;
        mensagem += `📝 *Análise:* ${interpretacao}\n\n`;
        mensagem += `⏰ ${new Date().toLocaleString('pt-BR')}`;
        
        // Formata o número
        const chatId = `${SEU_NUMERO}@c.us`;
        
        await client.sendMessage(chatId, mensagem);
        
        res.json({ 
            success: true, 
            message: 'Alerta enviado com sucesso!' 
        });
        
    } catch (error) {
        console.error('Erro ao enviar alerta:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});