
Configuration = null

httpProxy = require('http-proxy')
Cookies = require('cookies')

splitHostPort = (s) ->
  parts = s.split(':', 2)
  ret = { host: parts[0] } 
  if parts.length > 1
    ret.port = parseInt(parts[1], 10)
  else
    ret.port = 80
  return ret

HeaderText = "<body>header text </body>"

class Proxy
  constructor: () ->
    @internal_domains = {}
    @http_proxy = httpProxy.createProxyServer({})
    @http_proxy.on 'upgrade', (req, socket, head) =>
          @http_proxy.ws req, socket, head
    @http_proxy.on 'error', (e) =>
          console.log "error", e

  configApp: (app, config) =>
    @configuration = config
    app.get('/header', @respond(HeaderText))
    for appName, ca of config.apps
        app.get(ca.route,        @forward(ca.route, ca.port, ca.auth))
        app.get(ca.route+'/*',   @forward(ca.route, ca.port, ca.auth))
        app.post(ca.route+'/*',  @forward(ca.route, ca.port, ca.auth))
    app.get('/', @redirect(config.final.redirect));

  respond: (text) ->
    (req, res, next) =>
      res.writeHead(200);
      res.write(text, "binary")
      res.end()

  redirect: (loc) ->
     (req, res, next) ->
        res.redirect loc

  forward: (route, port, auth) =>
    route = route.replace /\//g, ""
    (req, res, next) =>
      if auth and not ((new Cookies(req, res)).get("X-MedBook-Perms"))?.match(route)
          res.redirect @configuration.final.redirect
      else
          @http_proxy.web(req, res, { target: "http://localhost:" + port, host: req.authproxy_domain, xfwd: true })

module.exports = new Proxy
