import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import swaggerUi from 'swagger-ui-express';
import helmet from 'helmet';

export function loadSpec(sessionCookie = 'recipe-hub-session') {
  const spec = parse(
    readFileSync(new URL('./openapi.yaml', import.meta.url), 'utf8'),
  );
  spec.components.securitySchemes.SessionCookie.name = sessionCookie;
  return spec;
}

export function mountDocs(app, config, sessionCookie) {
  // Defense in depth for application-factory callers that bypass env parsing.
  if (config.APP_DOCS_ENABLED !== true || config.NODE_ENV === 'production')
    return;
  const spec = loadSpec(sessionCookie);
  const noStore = (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  };
  app.get('/api/openapi.json', noStore, (_req, res) => res.json(spec));
  app.use(
    '/api/docs',
    noStore,
    helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: null,
      },
    }),
  );
  app.get('/api/docs', (_req, res) =>
    res.type('html').send(`<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Recipe Hub API Documentation</title>
<link rel="stylesheet" href="/api/docs/swagger-ui.css"></head>
<body><div id="swagger-ui"></div><script src="/api/docs/swagger-ui-bundle.js"></script>
<script src="/api/docs/init.js"></script></body></html>`),
  );
  app.get('/api/docs/init.js', (_req, res) =>
    res.type('js').send(`
window.onload = function () {
  SwaggerUIBundle({
    url: '/api/openapi.json', dom_id: '#swagger-ui',
    deepLinking: true, filter: true, docExpansion: 'list',
    defaultModelsExpandDepth: 1, validatorUrl: null,
    persistAuthorization: false, queryConfigEnabled: false,
    supportedSubmitMethods: ['get', 'post', 'put', 'patch', 'delete'],
    plugins: [function () { return { components: {
      authorizeBtn: function () { return null; },
      authorizeOperationBtn: function () { return null; }
    } }; }]
  });
};`),
  );
  app.use('/api/docs', swaggerUi.serve);
}
