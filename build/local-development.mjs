// Runs in Vite's local HTTP server only; never bundled into the Worker.
export function localDevelopment() {
  return {
    name: 'scene-sketch-local-development',
    enforce: 'pre',
    apply: (_config, env) => env.command === 'serve' && env.mode === 'development' && !env.isPreview,
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const host = req.headers.host || '';
        const peer = req.socket.remoteAddress;
        const localHost = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host);
        const localPeer = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(peer);
        const origin = req.headers.origin;
        if (!localHost || !localPeer || (origin && origin !== `http://${host}`)) {
          res.statusCode = 403;
          res.end('Local development is available only from this computer and origin.');
          return;
        }
        for (const name of Object.keys(req.headers)) {
          if (name.startsWith('oai-authenticated-')) delete req.headers[name];
        }
        req.headers['oai-authenticated-user-id'] = 'local-developer';
        req.headers['oai-authenticated-user-email'] = 'developer@localhost';
        // Cloudflare's request adapter reads rawHeaders rather than headers.
        const raw = [];
        for (let i = 0; i < req.rawHeaders.length; i += 2) {
          if (!req.rawHeaders[i].toLowerCase().startsWith('oai-authenticated-')) {
            raw.push(req.rawHeaders[i], req.rawHeaders[i + 1]);
          }
        }
        raw.push('oai-authenticated-user-id', 'local-developer', 'oai-authenticated-user-email', 'developer@localhost');
        req.rawHeaders = raw;
        next();
      });
    },
  };
}
