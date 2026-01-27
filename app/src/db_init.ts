import postgres from 'postgres';

export async function initDB(sql: postgres.Sql) {
    console.log("Initializing database schema...");
    try {
        await sql`
            CREATE TABLE IF NOT EXISTS leaderboard (
                id SERIAL PRIMARY KEY,
                player_name VARCHAR(100) NOT NULL,
                score INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        await sql`
            CREATE INDEX IF NOT EXISTS idx_score ON leaderboard(score DESC);
        `;
        console.log("Database initialized successfully.");
    } catch (err) {
        console.error("Failed to initialize database:", err);
    }
}
