import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL || 'postgres://user:password@localhost:5434/toy_db');

const server = Bun.serve({
    port: 3000,
    async fetch(req) {
        const url = new URL(req.url);

        // Serve Frontend
        if (url.pathname === "/" || url.pathname === "/index.html") {
            const indexPath = new URL("public/index.html", import.meta.url).pathname;
            return new Response(Bun.file(indexPath));
        }

        // Serve Static Files (CSS, JS)
        if (url.pathname.endsWith(".css") || url.pathname.endsWith(".js")) {
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

        // List Characters
        if (url.pathname === "/api/characters" && req.method === "GET") {
            const chars = await sql`SELECT * FROM characters ORDER BY created_at DESC`;
            return Response.json(chars);
        }

        // Create Character
        if (url.pathname === "/api/characters" && req.method === "POST") {
            const body = await req.json();
            if (!body.name || !body.power_level) {
                return new Response("Missing name or power_level", { status: 400 });
            }
            await sql`INSERT INTO characters (name, power_level) VALUES (${body.name}, ${body.power_level})`;
            return new Response("Created", { status: 201 });
        }

        return new Response("Not Found", { status: 404 });
    },
});

console.log(`Listening on http://localhost:${server.port} ...`);
