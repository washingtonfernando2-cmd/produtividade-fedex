const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do banco de dados PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'sua-chave-secreta-muito-segura', // Use uma chave segura e única
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24 // 24 horas
    }
}));

// Funções de inicialização do banco de dados
async function initializeDb() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS approved_users (
                id SERIAL PRIMARY KEY,
                fedex_id VARCHAR(255) UNIQUE NOT NULL,
                name VARCHAR(255)
            );
        `);
        console.log("Tabela 'approved_users' verificada/criada.");

        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                fedex_id VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL
            );
        `);
        console.log("Tabela 'users' verificada/criada.");

        await pool.query(`
            CREATE TABLE IF NOT EXISTS pedidos (
                id SERIAL PRIMARY KEY,
                idColaborador VARCHAR(255),
                nomeColaborador VARCHAR(255),
                numeroPedido VARCHAR(255),
                perfilPedido VARCHAR(255),
                quantidadePecas INTEGER,
                tempoSeparacao VARCHAR(255),
                dataHoraInicio VARCHAR(255),
                dataHoraFim VARCHAR(255)
            );
        `);
        console.log("Tabela 'pedidos' verificada/criada.");
    } catch (err) {
        console.error('Erro ao inicializar o banco de dados:', err);
    }
}
initializeDb();

// Middleware de autenticação
const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.status(401).send('Não autenticado');
    }
};

// Rotas de Autenticação
app.post('/register', async (req, res) => {
    const { fedexId, password } = req.body;
    try {
        const approvedUser = await pool.query('SELECT * FROM approved_users WHERE fedex_id = $1', [fedexId]);
        if (approvedUser.rows.length === 0) {
            return res.status(403).send('ID Fedex não aprovado para registro');
        }
        const userExists = await pool.query('SELECT * FROM users WHERE fedex_id = $1', [fedexId]);
        if (userExists.rows.length > 0) {
            return res.status(409).send('ID Fedex já registrado');
        }
        const passwordHash = await bcrypt.hash(password, 10);
        await pool.query('INSERT INTO users (fedex_id, password_hash) VALUES ($1, $2)', [fedexId, passwordHash]);
        res.status(201).send('Usuário registrado com sucesso');
    } catch (err) {
        console.error('Erro ao registrar usuário:', err);
        res.status(500).send('Erro no servidor');
    }
});

app.post('/login', async (req, res) => {
    const { fedexId, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE fedex_id = $1', [fedexId]);
        if (result.rows.length === 0) {
            return res.status(401).send('ID ou senha inválidos');
        }
        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).send('ID ou senha inválidos');
        }
        req.session.userId = user.id;
        res.send({ message: 'Login bem-sucedido' });
    } catch (err) {
        console.error('Erro ao fazer login:', err);
        res.status(500).send('Erro no servidor');
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy();
    res.send({ message: 'Sessão encerrada' });
});

app.get('/check-session', (req, res) => {
    res.json({ isLoggedIn: !!req.session.userId });
});

// Rotas da API (Protegidas)
app.get('/api/pedidos', isAuthenticated, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM pedidos ORDER BY id DESC');
        res.json({ pedidos: result.rows });
    } catch (err) {
        console.error('Erro ao buscar pedidos:', err);
        res.status(500).send('Erro no servidor');
    }
});

app.post('/api/pedidos', isAuthenticated, async (req, res) => {
    const { idColaborador, nomeColaborador, numeroPedido, perfilPedido, quantidadePecas, tempoSeparacao, dataHoraInicio, dataHoraFim } = req.body;
    try {
        await pool.query(
            'INSERT INTO pedidos (idColaborador, nomeColaborador, numeroPedido, perfilPedido, quantidadePecas, tempoSeparacao, dataHoraInicio, dataHoraFim) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [idColaborador, nomeColaborador, numeroPedido, perfilPedido, quantidadePecas, tempoSeparacao, dataHoraInicio, dataHoraFim]
        );
        res.status(201).send('Pedido salvo com sucesso');
    } catch (err) {
        console.error('Erro ao salvar pedido:', err);
        res.status(500).send('Erro no servidor');
    }
});

app.delete('/api/pedidos/:id', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM pedidos WHERE id = $1', [id]);
        res.send('Pedido excluído com sucesso');
    } catch (err) {
        console.error('Erro ao excluir pedido:', err);
        res.status(500).send('Erro no servidor');
    }
});

app.put('/api/pedidos/:id', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    const { numeroPedido, idColaborador, nomeColaborador, perfilPedido, quantidadePecas } = req.body;
    try {
        await pool.query(
            'UPDATE pedidos SET numeroPedido = $1, idColaborador = $2, nomeColaborador = $3, perfilPedido = $4, quantidadePecas = $5 WHERE id = $6',
            [numeroPedido, idColaborador, nomeColaborador, perfilPedido, quantidadePecas, id]
        );
        res.send('Pedido atualizado com sucesso');
    } catch (err) {
        console.error('Erro ao atualizar pedido:', err);
        res.status(500).send('Erro no servidor');
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});