// =====================================================
// FORMFLOW - BACKEND
// Servidor Node.js/Express para armazenamento central
// =====================================================
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// =====================================================
// ARMAZENAMENTO (arquivo JSON simples)
// =====================================================
const DATA_FILE = path.join(__dirname, 'data.json');

// Dados padrão
const DEFAULT_DATA = {
    formularios: [],
    respostas: [],
    config: {
        adminPin: '1234',
        theme: 'dark',
        siteName: 'FormFlow',
        siteDesc: 'Sistema de Formulários',
        accentColor: 'indigo',
        notifications: true,
        compactMode: false,
        logoType: 'icon',
        logoPreset: 'file-text',
        logoCustom: '',
        dataCleared: false
    }
};

// Carregar dados do arquivo
function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const raw = fs.readFileSync(DATA_FILE, 'utf8');
            const data = JSON.parse(raw);
            return { ...DEFAULT_DATA, ...data };
        }
    } catch (e) {
        console.error('Erro ao carregar dados:', e.message);
    }
    return { ...DEFAULT_DATA };
}

// Salvar dados no arquivo
function saveData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Erro ao salvar dados:', e.message);
    }
}

// Estado em memória
let db = loadData();

// =====================================================
// ROTAS DA API
// =====================================================

// --- Formulários ---

// Listar todos os formulários
app.get('/api/formularios', (req, res) => {
    res.json(db.formularios);
});

// Obter formulário por ID
app.get('/api/formularios/:id', (req, res) => {
    const form = db.formularios.find(f => f.id === req.params.id);
    if (!form) {
        return res.status(404).json({ error: 'Formulário não encontrado' });
    }
    res.json(form);
});

// Criar formulário
app.post('/api/formularios', (req, res) => {
    const form = req.body;
    form.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    form.createdAt = new Date().toISOString();
    db.formularios.push(form);
    saveData(db);
    res.status(201).json(form);
});

// Atualizar formulário
app.put('/api/formularios/:id', (req, res) => {
    const idx = db.formularios.findIndex(f => f.id === req.params.id);
    if (idx === -1) {
        return res.status(404).json({ error: 'Formulário não encontrado' });
    }
    db.formularios[idx] = { ...db.formularios[idx], ...req.body, id: req.params.id };
    saveData(db);
    res.json(db.formularios[idx]);
});

// Excluir formulário
app.delete('/api/formularios/:id', (req, res) => {
    db.formularios = db.formularios.filter(f => f.id !== req.params.id);
    // Também remove respostas associadas
    db.respostas = db.respostas.filter(r => r.formularioId !== req.params.id);
    saveData(db);
    res.json({ success: true });
});

// --- Respostas ---

// Listar todas as respostas
app.get('/api/respostas', (req, res) => {
    res.json(db.respostas);
});

// Listar respostas de um formulário
app.get('/api/respostas/formulario/:formId', (req, res) => {
    const respostas = db.respostas.filter(r => r.formularioId === req.params.formId);
    res.json(respostas);
});

// Criar resposta
app.post('/api/respostas', (req, res) => {
    const resposta = req.body;
    resposta.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    resposta.receivedAt = new Date().toISOString();
    resposta.status = 'pendente';
    db.respostas.push(resposta);
    saveData(db);
    res.status(201).json(resposta);
});

// Atualizar status da resposta
app.patch('/api/respostas/:id', (req, res) => {
    const idx = db.respostas.findIndex(r => r.id === req.params.id);
    if (idx === -1) {
        return res.status(404).json({ error: 'Resposta não encontrada' });
    }
    db.respostas[idx] = { ...db.respostas[idx], ...req.body, id: req.params.id };
    db.respostas[idx].updatedAt = new Date().toISOString();
    saveData(db);
    res.json(db.respostas[idx]);
});

// Excluir resposta
app.delete('/api/respostas/:id', (req, res) => {
    db.respostas = db.respostas.filter(r => r.id !== req.params.id);
    saveData(db);
    res.json({ success: true });
});

// --- Configuração ---

// Obter configuração
app.get('/api/config', (req, res) => {
    res.json(db.config);
});

// Atualizar configuração
app.put('/api/config', (req, res) => {
    db.config = { ...db.config, ...req.body };
    saveData(db);
    res.json(db.config);
});

// --- Limpar tudo ---

// Limpar todos os dados
app.post('/api/clear', (req, res) => {
    db.formularios = [];
    db.respostas = [];
    db.config.dataCleared = true;
    saveData(db);
    res.json({ success: true });
});

// --- Dados de exemplo ---

// Gerar dados de exemplo (apenas se ainda não existirem)
app.post('/api/sample-data', (req, res) => {
    if (db.config.dataCleared) {
        return res.json({ success: false, message: 'Dados já foram limpos pelo usuário' });
    }
    
    if (db.formularios.length === 0) {
        const sampleForms = [
            {
                id: 'sample1',
                titulo: 'Cadastro de Cliente',
                descricao: 'Formulário de cadastro para novos clientes',
                campos: [
                    { id: 'c1', tipo: 'texto', label: 'Nome Completo', obrigatorio: true },
                    { id: 'c2', tipo: 'email', label: 'E-mail', obrigatorio: true },
                    { id: 'c3', tipo: 'tel', label: 'Telefone', obrigatorio: false },
                    { id: 'c4', tipo: 'textarea', label: 'Observações', obrigatorio: false }
                ],
                createdAt: new Date(Date.now() - 86400000 * 7).toISOString()
            },
            {
                id: 'sample2',
                titulo: 'Pesquisa de Satisfação',
                descricao: 'Ajude-nos a melhorar nossos serviços',
                campos: [
                    { id: 'c5', tipo: 'texto', label: 'Seu Nome', obrigatorio: false },
                    { id: 'c6', tipo: 'select', label: 'Nota', opcoes: ['1 - Péssimo', '2 - Ruim', '3 - Regular', '4 - Bom', '5 - Excelente'], obrigatorio: true },
                    { id: 'c7', tipo: 'textarea', label: 'O que podemos melhorar?', obrigatorio: false },
                    { id: 'c8', tipo: 'radio', label: 'Recomendaria nosso serviço?', opcoes: ['Sim', 'Não', 'Talvez'], obrigatorio: true }
                ],
                createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
            },
            {
                id: 'sample3',
                titulo: 'Agendamento de Consulta',
                descricao: 'Preencha para agendar sua consulta',
                campos: [
                    { id: 'c9', tipo: 'texto', label: 'Nome do Paciente', obrigatorio: true },
                    { id: 'c10', tipo: 'date', label: 'Data Preferida', obrigatorio: true },
                    { id: 'c11', tipo: 'select', label: 'Tipo de Consulta', opcoes: ['Primeira Consulta', 'Retorno', 'Emergência', 'Check-up'], obrigatorio: true },
                    { id: 'c12', tipo: 'textarea', label: 'Descreva seus sintomas', obrigatorio: false }
                ],
                createdAt: new Date(Date.now() - 86400000 * 1).toISOString()
            }
        ];

        const sampleRespostas = [
            {
                id: 'resp1',
                formularioId: 'sample1',
                formularioTitulo: 'Cadastro de Cliente',
                dados: { 'Nome Completo': 'Maria Silva', 'E-mail': 'maria@email.com', 'Telefone': '(11) 99999-1234', 'Observações': 'Cliente indicado por João' },
                status: 'lido',
                receivedAt: new Date(Date.now() - 86400000 * 6).toISOString()
            },
            {
                id: 'resp2',
                formularioId: 'sample1',
                formularioTitulo: 'Cadastro de Cliente',
                dados: { 'Nome Completo': 'Pedro Santos', 'E-mail': 'pedro.santos@email.com', 'Telefone': '(21) 98888-5678', 'Observações': '' },
                status: 'pendente',
                receivedAt: new Date(Date.now() - 86400000 * 2).toISOString()
            },
            {
                id: 'resp3',
                formularioId: 'sample2',
                formularioTitulo: 'Pesquisa de Satisfação',
                dados: { 'Seu Nome': 'Ana Costa', 'Nota': '5 - Excelente', 'O que podemos melhorar?': 'Tudo perfeito!', 'Recomendaria nosso serviço?': 'Sim' },
                status: 'lido',
                receivedAt: new Date(Date.now() - 86400000 * 1).toISOString()
            },
            {
                id: 'resp4',
                formularioId: 'sample2',
                formularioTitulo: 'Pesquisa de Satisfação',
                dados: { 'Seu Nome': 'Carlos Oliveira', 'Nota': '3 - Regular', 'O que podemos melhorar?': 'Velocidade do atendimento poderia ser melhor', 'Recomendaria nosso serviço?': 'Talvez' },
                status: 'arquivado',
                receivedAt: new Date(Date.now() - 86400000 * 5).toISOString()
            },
            {
                id: 'resp5',
                formularioId: 'sample3',
                formularioTitulo: 'Agendamento de Consulta',
                dados: { 'Nome do Paciente': 'Lucia Fernandes', 'Data Preferida': '2026-09-10', 'Tipo de Consulta': 'Primeira Consulta', 'Descreva seus sintomas': 'Dor de cabeça frequente' },
                status: 'pendente',
                receivedAt: new Date(Date.now() - 3600000 * 5).toISOString()
            }
        ];

        db.formularios = sampleForms;
        db.respostas = sampleRespostas;
        saveData(db);
        return res.json({ success: true, message: 'Dados de exemplo criados' });
    }
    
    res.json({ success: false, message: 'Já existem formulários' });
});

// =====================================================
// SERVIÇO DE ARQUIVOS ESTÁTICOS
// =====================================================

// Servir o index.html na raiz
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Servir arquivos estáticos
app.use(express.static(__dirname));

// =====================================================
// INICIAR SERVIDOR
// =====================================================
app.listen(PORT, () => {
    console.log(`FormFlow backend rodando na porta ${PORT}`);
});