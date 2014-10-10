


httpProxy = require('http-proxy')
passport = require('passport')
MixedStrategy = require('./mixed_strategy')
Cookies = require('cookies')

HeaderText = "<body>header text </body>"

passport.serializeUser (user, done) ->
  done(null, user.email)

passport.deserializeUser (id, done) ->
  done(null, id)

ensureAuthed = (req, res, next) ->
  if req.session.passport?.user?
    return next()
  takeoff req, res, next
  return passport.authenticate(req.authproxy_domain, { scope: ['profile', 'email'], successRedirect: "/authproxy/land",  failureRedirect: '/authproxy/google' })(req, res, next)

  # return res.redirect('/authproxy/google')

testVerify = (accessToken, refreshToken, profile, done) ->
  process.nextTick ->
    return done(null, profile)

randomUpstream = (upstreams) ->
  upstreams[Math.floor((Math.random()*upstreams.length))]

splitHostPort = (s) ->
  parts = s.split(':', 2)
  ret = {
    host: parts[0]
  }

  if parts.length > 1
    ret.port = parseInt(parts[1], 10)
  else
    ret.port = 80

  return ret

respondHeader = (req, res, next) =>
  res.writeHead(200);
  res.write(HeaderText, "binary")
  res.end()

takeoff = (req, res, next) =>
  (new Cookies(req, res)).set "Final-Destination", req.originalUrl

land = (req, res, next) =>
  res.redirect (new Cookies(req, res)).get "Final-Destination"



class InternalDomain
  constructor: (config) ->
    @config = config

class Proxy
  constructor: () ->
    @internal_domains = {}
    @http_proxy = httpProxy.createProxyServer({})

    @http_proxy.on 'upgrade', (req, socket, head) =>
          @http_proxy.ws req, socket, head

    @http_proxy.on 'error', (e) =>
          console.log "error", e


  # host,upstream,client_id,client_secret,cookie_secret
  addInternalDomain: (auth_domain, domain) ->
    @internal_domains[domain.host] = domain

    strategy = new MixedStrategy({
      hostedDomain: auth_domain,
      clientID: domain.client_id,
      clientSecret: domain.client_secret,
      callbackURL: "http://#{domain.host}/authproxy/google/return"
      }, testVerify)
    passport.use(domain.host, strategy)

  configApp: (app, config) =>

    app.use(passport.initialize())
    app.use(passport.session())
    app.use(@checkDomain())
    app.get('/header', respondHeader)
    app.get('/authproxy/google', @googleAuth())
    app.get('/authproxy/google/return', @callback())
    app.get('/authproxy/user', ensureAuthed, @getUser())
    app.get('/authproxy/land', land)

    for appName, ca of config.apps
        app.get(ca.route,        ensureAuthed, @goForward(ca.port))
        app.get(ca.route+'/*',   ensureAuthed, @goForward(ca.port))
        app.post(ca.route+'/*',  ensureAuthed, @goForward(ca.port))

    app.get('/', @goto(config.final.redirect));


  goProxy: =>
    (req, res, next) =>
      dest = splitHostPort(randomUpstream(req.authproxy_endpoint.upstream))
      @http_proxy.web(req, res, {
        target: "http://#{dest.host}:#{dest.port}",
        headers: { 'x-forwarded-user': req.session.passport.user },
        host: req.authproxy_domain,
        xfwd: true
        })

  getUser: =>
    (req, res) =>
      res.send(req.session.passport.user)

  googleAuth: =>
    (req, res, next) =>
      passport.authenticate(req.authproxy_domain, { scope: ['profile', 'email'] })(req, res, next)

  goto: (dest) =>
      (req, res, next) =>
          res.redirect (dest)

  callback: () =>
    (req, res, next) =>
      passport.authenticate(req.authproxy_domain, { successRedirect: '/authproxy/land', failureRedirect: '/authproxy/google' })(req, res, next)

  checkDomain: =>
    (req, res, next) =>
      endpoint = splitHostPort(req.headers['host'])
      search_domain = "#{endpoint.host}:#{endpoint.port}"
      e = @internal_domains[search_domain]

      unless e?
        return res.status(404).send('invalid domain' + search_domain)

      req.authproxy_endpoint = e
      req.authproxy_domain = search_domain
      next()

  goForward: (port) =>
    (req, res, next) =>
      @http_proxy.web(req, res, {
        target: "http://localhost:" + port,
        headers: { 'x-forwarded-user': req.session.passport.user },
        host: req.authproxy_domain,
        xfwd: true
        })

module.exports = new Proxy
