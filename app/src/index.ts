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
        if (url.pathname.startsWith("/")) {
            const safePath = new URL(`public${url.pathname}`, import.meta.url).pathname;
            const file = Bun.file(safePath);
            if (await file.exists()) {
                return new Response(file);
            }
        }

        // Health Check
        if (url.pathname === "/health") {
            return new Response("OK", { status: 200 });
        }

        return new Response("Not Found", { status: 404 });
    },
});

