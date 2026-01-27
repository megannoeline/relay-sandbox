import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL || 'postgres://user:password@localhost:5434/toy_db');

const server = Bun.serve({
    port: 3000,
    hostname: "0.0.0.0",
    async fetch(req) {
        const url = new URL(req.url);

        // Serve Frontend
        if (url.pathname === "/" || url.pathname === "/index.html") {
            const indexPath = new URL("public/index.html", import.meta.url).pathname;
            return new Response(Bun.file(indexPath));
        }

        // Serve Static Files (CSS, JS)
        if (url.pathname.startsWith("/")) {
            const safePath = new URL(`public${url.pathname}`, import.meta.url).pathname;
            const file = Bun.file(safePath);
            if (await file.exists()) {
                return new Response(file);
            }
        }

        // Health Check
        if (url.pathname === "/health") {
            try {
                await sql`SELECT 1`;
                return new Response("OK", { status: 200 });
            } catch (err) {
                return new Response("DB Error", { status: 500 });
            }
        }

        // List Leaderboard
        if (url.pathname === "/api/leaderboard" && req.method === "GET") {
            try {
                const scores = await sql`SELECT player_name, score, created_at FROM leaderboard ORDER BY score DESC LIMIT 10`;
                return Response.json(scores);
            } catch (err) {
                return new Response("Leaderboard Error", { status: 500 });
            }
        }

        // Submit Score
        if (url.pathname === "/api/scores" && req.method === "POST") {
            try {
                const body = await req.json();
                if (!body.name || body.score === undefined) {
                    return new Response("Missing name or score", { status: 400 });
                }
                await sql`INSERT INTO leaderboard (player_name, score) VALUES (${body.name}, ${body.score})`;
                return new Response("Created", { status: 201 });
            } catch (err) {
                console.error("Score submission error:", err);
                return new Response("Score Submission Error", { status: 500 });
            }
        }

        return new Response("Not Found", { status: 404 });
    },
});
