// Static file server for production.
// - /assets/** (hashed by Vite) → cached forever
// - index.html + everything else → no-cache so deploys land immediately
const http = require('http')
const sirv = require('sirv')

const serve = sirv('dist', {
  single: true, // SPA fallback: unknown paths → index.html
  setHeaders(res, pathname) {
    if (pathname.startsWith('/assets/')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    } else {
      res.setHeader('Cache-Control', 'no-cache')
    }
  },
})

const PORT = process.env.PORT || 4173
http.createServer(serve).listen(PORT, () => {
  console.log(`[server] Listening on :${PORT}`)
})
