express = require('express')
session = require('express-session')
http = require('http')
httpProxy = require('http-proxy')
Cookies = require('cookies')
toml = require('toml')
fs = require('fs')

getConfig = (path) ->
  try
    conf = fs.readFileSync(path)
    toml.parse(conf)
  catch e
    console.log("Failed to parse configuration file #{path}")
    process.exit(1)

args = process.argv.slice(2);
if args.length < 1
  console.log("Please specify configuration file")
  process.exit(1)

server = null;
app = null;
menuFile = null;

readMenu = ->
    menuFile = fs.readFileSync("menu.html");
    console.log "menu.html read", menuFile.length
readMenu()

run =  ->
    CONFIG = getConfig(args[0]);
    console.log "loading",  args[0]

    if (server)
        server.close()

    app = express()
    app.use('/journalentry', express.static(__dirname + '/journalentry'));

    ###
    app.use(session({
      ws: true,
      secret: CONFIG.server.cookie_secret,
      resave: true,
      saveUninitialized: true
    }))
    ###
    proxy = new Proxy();
    proxy.configApp(app, CONFIG)
    server = http.createServer(app)

    server.listen CONFIG.server.bind_port, CONFIG.server.bind_ip, (err) ->
      if err
        console.log("Failed to bind")
        process.exit(1)
      console.log("Listening on #{CONFIG.server.bind_ip}:#{CONFIG.server.bind_port}")


splitHostPort = (s) ->
  parts = s.split(':', 2)
  ret = { host: parts[0] } 
  if parts.length > 1
    ret.port = parseInt(parts[1], 10)
  else
    ret.port = 80
  return ret



class Proxy
  constructor: () ->
    @internal_domains = {}
    @http_proxy = httpProxy.createProxyServer({ws:true})
    @http_proxy.on 'upgrade', (req, socket) =>
          console.log "UPGRADE"
          process.exit 100
          @http_proxy.ws req, socket, { target: "http://localhost:10003"}

    @http_proxy.on 'error', (e) =>
          if e.code != "ECONNRESET"
              console.log "error", e

  configApp: (app, config) =>
    @configuration = config
    menu = []
    app.get('/menu', @getMenu menu)
    for appName, ca of config.apps
        app.get(ca.route,        @forward(ca.route, ca.port, ca.auth))
        app.get(ca.route+'/*',   @forward(ca.route, ca.port, ca.auth))
        app.post(ca.route+'/*',  @forward(ca.route, ca.port, ca.auth))
        menuItem = String(ca.menuItem);
        if menuItem == null
            menuItem = ca.route
        console.log "menuItem", menuItem, typeof(menuItem)
        menuItem = menuItem.replace /\ /g, "&nbsp;"
        link = "<a class='MedBookLink' href='"+ca.route+"'>" + menuItem + "</a>"
        if ca.menuItem
            if ca.menuPosition != undefined
                menu.splice(ca.menuPosition, 0, link);
            else
                menu.push(link);
    app.get('/*', @finally());
    app.post('/*', @finally());
    console.log("configApp menu", menu);

  getMenu: (menu) ->
    (req, res, next) =>
        text = String(menuFile).replace("LIST", (menu.map (a) -> "<li>"+a+"</li><br/>") .join(''))
        res.writeHead(200);
        res.write(text, "binary")
        res.end()

  respond: (text) ->
    (req, res, next) =>
      res.writeHead(200);
      res.write(text, "binary")
      res.end()

  redirect: (loc) ->
     (req, res, next) ->
        console.log "Gateway redirect", loc
        res.redirect loc

  forward: (route, port, auth) =>
    route = route.replace /\//g, ""
    (req, res, next) =>
      if auth and not ((new Cookies(req, res)).get("MedBookPermissions"))?.match(route)
          console.log "Gateway redirect final"
          res.redirect @configuration.final.redirect
      else
          @http_proxy.web(req, res, { target: "http://localhost:" + port, host: req.authproxy_domain, xfwd: true })

  finally:  =>
    (req, res, next) =>
      @http_proxy.web(req, res, { target: "http://localhost:" + @configuration.final.port, host: req.authproxy_domain, xfwd: true })

run()
console.log "watching",  args[0] 
fs.watchFile args[0], run
fs.watchFile "menu.html", readMenu

