const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;

// 🔴 MUDANÇA 1: Caminho para o volume persistente do Fly.io
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: '/data/whatsapp-data' // Agora usa o volume do Fly.io!
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ],
        // 🔴 MUDANÇA 2: Caminho do Chrome no Fly.io
        executablePath: '/usr/bin/chromium' // Caminho fixo do Chrome no Fly.io
    }
});

// Evento: QR Code gerado
client.on('qr', (qr) => {
    console.log('📱 ESCANEIE ESTE QR CODE COM SEU WHATSAPP:');
    qrcode.generate(qr, { small: true });
    
    // Log alternativo do QR code em texto (caso o gráfico não apareça)
    console.log('QR Code alternativo:', qr);
});

// Evento: Cliente pronto
client.on('ready', () => {
    console.log('✅ WhatsApp conectado e pronto!');
    console.log('📊 Servidor rodando na porta:', PORT);
    console.log('👤 Nome:', client.info.pushname);
    console.log('📱 Número:', client.info.wid.user);
});

// Evento: Erro
client.on('auth_failure', (msg) => {
    console.error('❌ Falha na autenticação:', msg);
});

client.on('disconnected', (reason) => {
    console.log('❌ Cliente desconectado:', reason);
});

// Inicializa o cliente
console.log('🚀 Iniciando cliente WhatsApp...');
client.initialize();

// ============ API ENDPOINTS ============

// Endpoint para enviar mensagem
app.post('/send-message', async (req, res) => {
    try {
        const { numero, mensagem } = req.body;
        
        let numeroFormatado = numero.replace(/\D/g, '');
        if (!numeroFormatado.startsWith('55')) {
            numeroFormatado = '55' + numeroFormatado;
        }
        
        const chatId = `${numeroFormatado}@c.us`;
        
        console.log(`📨 Enviando para ${chatId}`);
        await client.sendMessage(chatId, mensagem);
        
        res.json({ success: true, message: 'Mensagem enviada!' });
        
    } catch (error) {
        console.error('Erro:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint de status
app.get('/status', (req, res) => {
    const info = client.info;
    res.json({
        connected: !!info,
        number: info ? info.wid.user : null,
        pushname: info ? info.pushname : null
    });
});

// Endpoint para alertas
app.post('/alerta-bitcoin', async (req, res) => {
    try {
        const { sinal, preco_brl, interpretacao } = req.body;
        
        // SEU NÚMERO - JÁ ESTÁ CORRETO!
        const SEU_NUMERO = '5534997766047'; // ✅ Perfeito!
        
        const mensagem = `🚨 *ALERTA BITCOIN* 🚨\n\n` +
                        `📊 *Sinal:* ${sinal}\n` +
                        `💰 *Preço:* R$ ${parseFloat(preco_brl).toFixed(2)}\n` +
                        `📝 *Análise:* ${interpretacao}\n` +
                        `⏰ ${new Date().toLocaleString('pt-BR')}`;
        
        const chatId = `${SEU_NUMERO}@c.us`;
        await client.sendMessage(chatId, mensagem);
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Erro no alerta:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});