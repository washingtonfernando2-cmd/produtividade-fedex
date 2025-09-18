const { Pool } = require('pg');

const approvedUsers = [
    { fedex_id: '904498', name: 'Washington Fernando' },
    // Adicione mais usuários aqui, se precisar
    // { fedex_id: 'ID_OUTRO_USUARIO', name: 'Nome do Outro Colaborador' },
];

const pool = new Pool({
    connectionString: 'postgresql://produtividade_db_kp63_user:2YY8NbAiTjvbHvemygQdReUrX0XOGG5e@dpg-d35agd8gjchc73ev82hg-a.oregon-postgres.render.com/produtividade_db_kp63',
    ssl: {
        rejectUnauthorized: false
    }
});

async function addUsers() {
    try {
        for (const user of approvedUsers) {
            await pool.query(
                'INSERT INTO approved_users (fedex_id, name) VALUES ($1, $2) ON CONFLICT (fedex_id) DO NOTHING',
                [user.fedex_id, user.name]
            );
            console.log(`Usuário ${user.name} adicionado ou já existente.`);
        }
        console.log('Todos os usuários aprovados foram processados.');
    } catch (err) {
        console.error('Erro ao adicionar usuários:', err);
    } finally {
        pool.end();
    }
}

addUsers();