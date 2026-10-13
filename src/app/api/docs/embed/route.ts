/**
 * HTML isolado do Swagger UI (sem React).
 * Evita o bug do swagger-ui-react com React 19 (spinner infinito ao expandir).
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>API Docs · Swagger UI</title>
  <link rel="stylesheet" href="/api/docs/assets/swagger-ui.css" />
  <style>
    body { margin: 0; background: #fafafa; }
    .swagger-ui .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="/api/docs/assets/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: "/api/openapi.json",
      dom_id: "#swagger-ui",
      deepLinking: true,
      docExpansion: "list",
      defaultModelsExpandDepth: 1,
      tryItOutEnabled: true,
      presets: [SwaggerUIBundle.presets.apis],
      layout: "BaseLayout"
    });
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
