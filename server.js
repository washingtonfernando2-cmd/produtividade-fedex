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
        
        // CÓDIGO CORRIGIDO PARA CRIAR A TABELA 'session'
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