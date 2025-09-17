const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.use(session({
    secret: 'sua_senha_secreta_aqui',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: 'auto' }
}));

const db = new sqlite3.Database('database.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Conectado ao banco de dados SQLite.');
    db.run(`CREATE TABLE IF NOT EXISTS pedidos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        idColaborador TEXT,
        nomeColaborador TEXT,
        numeroPedido TEXT,
        perfilPedido TEXT,
        quantidadePecas INTEGER,
        tempoSeparacao TEXT,
        dataHoraInicio TEXT,
        dataHoraFim TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fedexId TEXT UNIQUE,
        password TEXT
    )`);
    // Tabela para usuários aprovados
    db.run(`CREATE TABLE IF NOT EXISTS approved_users (
        fedexId TEXT UNIQUE,
        nome TEXT
    )`);
});

const isAuthenticated = (req, res, next) => {
    if (req.session.isLoggedIn) {
        return next();
    }
    res.status(401).send('Não autorizado');
};

app.post('/login', (req, res) => {
    const { fedexId, password } = req.body;
    db.get(`SELECT * FROM users WHERE fedexId = ?`, [fedexId], async (err, user) => {
        if (err || !user) {
            return res.status(401).send('ID ou senha inválidos');
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
            req.session.isLoggedIn = true;
            req.session.fedexId = fedexId;
            res.status(200).send('Login bem-sucedido');
        } else {
            res.status(401).send('ID ou senha inválidos');
        }
    });
});

app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Erro ao fazer logout');
        }
        res.status(200).send('Logout bem-sucedido');
    });
});

app.get('/check-session', (req, res) => {
    res.json({ isLoggedIn: req.session.isLoggedIn, fedexId: req.session.fedexId });
});

app.post('/register', async (req, res) => {
    const { fedexId, password } = req.body;
    // Checa se o ID FedEx está na lista de aprovados
    db.get(`SELECT * FROM approved_users WHERE fedexId = ?`, [fedexId], async (err, approvedUser) => {
        if (err || !approvedUser) {
            return res.status(401).send('ID FedEx não aprovado para registro');
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run(`INSERT INTO users (fedexId, password) VALUES (?, ?)`, [fedexId, hashedPassword], (err) => {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(409).send('ID FedEx já está registrado');
                }
                return res.status(500).send('Erro ao registrar usuário');
            }
            res.status(201).send('Usuário registrado com sucesso');
        });
    });
});

app.get('/', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/pedidos', isAuthenticated, (req, res) => {
    const { fedexId } = req.session;
    db.all(`SELECT * FROM pedidos WHERE idColaborador = ?`, [fedexId], (err, rows) => {
        if (err) {
            res.status(500).send("Erro ao buscar pedidos.");
            return;
        }
        res.json({ pedidos: rows });
    });
});

app.post('/api/pedidos', isAuthenticated, (req, res) => {
    const { idColaborador, nomeColaborador, numeroPedido, perfilPedido, quantidadePecas, tempoSeparacao, dataHoraInicio, dataHoraFim } = req.body;
    db.run(`INSERT INTO pedidos (idColaborador, nomeColaborador, numeroPedido, perfilPedido, quantidadePecas, tempoSeparacao, dataHoraInicio, dataHoraFim) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [idColaborador, nomeColaborador, numeroPedido, perfilPedido, quantidadePecas, tempoSeparacao, dataHoraInicio, dataHoraFim],
        function (err) {
            if (err) {
                res.status(500).send("Erro ao salvar pedido.");
                return;
            }
            res.json({ id: this.lastID });
        });
});

app.delete('/api/pedidos/:id', isAuthenticated, (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM pedidos WHERE id = ?`, id, (err) => {
        if (err) {
            res.status(500).send("Erro ao apagar pedido.");
            return;
        }
        res.send("Pedido apagado com sucesso.");
    });
});

app.put('/api/pedidos/:id', isAuthenticated, (req, res) => {
    const { id } = req.params;
    const { idColaborador, nomeColaborador, numeroPedido, perfilPedido, quantidadePecas } = req.body;
    db.run(`UPDATE pedidos SET idColaborador = ?, nomeColaborador = ?, numeroPedido = ?, perfilPedido = ?, quantidadePecas = ? WHERE id = ?`,
        [idColaborador, nomeColaborador, numeroPedido, perfilPedido, quantidadePecas, id], (err) => {
            if (err) {
                res.status(500).send("Erro ao atualizar pedido.");
                return;
            }
            res.send("Pedido atualizado com sucesso.");
        });
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});