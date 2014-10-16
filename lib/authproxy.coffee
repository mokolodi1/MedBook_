express = require('express')
session = require('express-session')
http = require('http')
toml = require('toml')
fs = require('fs')
proxy = require('./proxy')

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

run =  ->
    CONFIG = getConfig(args[0]);
    console.log "loading",  args[0]

    if (server)
        server.close()

    app = express()
    app.use(session({
      ws: true,
      secret: CONFIG.server.cookie_secret,
      resave: true,
      saveUninitialized: true
    }))
    proxy.configApp(app, CONFIG)
    server = http.createServer(app)

    server.listen CONFIG.server.bind_port, CONFIG.server.bind_ip, (err) ->
      if err
        console.log("Failed to bind")
        process.exit(1)
      console.log("Listening on #{CONFIG.server.bind_ip}:#{CONFIG.server.bind_port}")

run()
console.log "watching",  args[0]
fs.watchFile args[0], run
