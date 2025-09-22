const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, '')));

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
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS "session" (
                "sid" varchar NOT NULL COLLATE "default",
                "sess" json NOT NULL,
                "expire" timestamp(6) NOT NULL
            )
            WITH (OIDS=FALSE);
        `);
        console.log("Tabela 'session' verificada/criada.");
        
        await pool.query(`
            ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
        `);
        
        await pool.query(`
            CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
        `);

    } catch (err) {
        console.error('Erro ao inicializar o banco de dados:', err);
    }
}
initializeDb();

app.get('/api/pedidos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM pedidos ORDER BY id DESC');
        res.json({ pedidos: result.rows });
    } catch (err) {
        console.error('Erro ao buscar pedidos:', err);
        res.status(500).send('Erro no servidor');
    }
});

app.post('/api/pedidos', async (req, res) => {
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

app.delete('/api/pedidos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM pedidos WHERE id = $1', [id]);
        res.send('Pedido excluído com sucesso');
    } catch (err) {
        console.error('Erro ao excluir pedido:', err);
        res.status(500).send('Erro no servidor');
    }
});

app.put('/api/pedidos/:id', async (req, res) => {
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

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
