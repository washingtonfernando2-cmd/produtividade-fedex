const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

// Configurar o body-parser para processar JSON
app.use(bodyParser.json());

// Conectar ao banco de dados SQLite
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Conectado ao banco de dados SQLite.');
});

// Criar a tabela de pedidos se ela não existir
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS pedidos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            idColaborador TEXT,
            nomeColaborador TEXT,
            numeroPedido TEXT,
            perfilPedido TEXT,
            quantidadePecas INTEGER,
            tempoSeparacao TEXT,
            dataHoraInicio TEXT,
            dataHoraFim TEXT
        )
    `, (err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Tabela "pedidos" pronta.');
    });
});

// Rota para obter todos os pedidos do banco de dados
app.get('/api/pedidos', (req, res) => {
    db.all('SELECT * FROM pedidos ORDER BY dataHoraFim DESC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            pedidos: rows
        });
    });
});

// Rota para adicionar um novo pedido ao banco de dados
app.post('/api/pedidos', (req, res) => {
    const { idColaborador, nomeColaborador, numeroPedido, perfilPedido, quantidadePecas, tempoSeparacao, dataHoraInicio, dataHoraFim } = req.body;
    db.run(`INSERT INTO pedidos (idColaborador, nomeColaborador, numeroPedido, perfilPedido, quantidadePecas, tempoSeparacao, dataHoraInicio, dataHoraFim) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [idColaborador, nomeColaborador, numeroPedido, perfilPedido, quantidadePecas, tempoSeparacao, dataHoraInicio, dataHoraFim],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({
                message: 'Pedido salvo com sucesso',
                id: this.lastID
            });
        });
});

// Rota para deletar um pedido
app.delete('/api/pedidos/:id', (req, res) => {
    const id = req.params.id;
    db.run(`DELETE FROM pedidos WHERE id = ?`, id, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Pedido deletado com sucesso' });
    });
});

// Rota para atualizar um pedido
app.put('/api/pedidos/:id', (req, res) => {
    const id = req.params.id;
    const { idColaborador, nomeColaborador, numeroPedido, perfilPedido, quantidadePecas } = req.body;
    db.run(`UPDATE pedidos SET idColaborador = ?, nomeColaborador = ?, numeroPedido = ?, perfilPedido = ?, quantidadePecas = ? WHERE id = ?`,
        [idColaborador, nomeColaborador, numeroPedido, perfilPedido, quantidadePecas, id],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ message: 'Pedido atualizado com sucesso' });
        });
});

// Middleware para servir arquivos estáticos da pasta atual
app.use(express.static(path.join(__dirname, '')));

// Iniciar o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});

process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Conexão com o banco de dados fechada.');
        process.exit();
    });
});