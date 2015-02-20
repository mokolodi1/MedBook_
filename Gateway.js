var args = process.argv.slice(2);
if (args.length < 1) {
  args = ["config.toml"]
}

var Cookies = require('cookies');
var toml = require('toml');
var fs = require('fs');
var url = require('url');
var path = require('path');
var http = require('http');
var crypto = require('crypto');
var randomstring = require("randomstring");

var SECRET;
function changeSecret() {
    SECRET = randomstring.generate(7);
}
changeSecret();

setInterval(changeSecret, 30000);

function hash(pwd) {
    var hash = crypto.createHash('sha256').update(SECRET + pwd).digest('base64');
    return hash;
}

var server = null;

menuFile = null;

getPort = function(req) {
    var a = req.url.split("/");
    if (a.length > 1) {
        var p = routes["/" + a[1]];
        if (p)
            return p;
    }
    return final;
}

readMenu = function() {
  menuFile = fs.readFileSync("menu.html");
};

readMenu();


redirectServer = null;
readSSLcredentials = function() {
    if (config.server.ssl && config.server.nonssl)  {
      if (redirectServer)
          server.close();

      redirectServer = require('http').createServer(function(req, res) {
           var red = "https://" + config.server.host + ":" + config.server.ssl + req.url;
           res.writeHead(307, {'Location': red});
           res.end();

      });
      redirectServer.listen(config.server.nonssl);
    }

    var options = {
         key: fs.readFileSync(config.server.key),
         cert: fs.readFileSync(config.server.cert),
    };

    if (config.server.chain) {
        var ca = []
        var chain = fs.readFileSync(config.server.chain, 'utf8');
        chain = chain.split("\n");
        var cert = [];
        for (var i =0; i < chain.length; i++) {
          var line = chain[i];
          if (line.length > 0) {
            cert.push(line);
            if (line.match(/-END CERTIFICATE-/)) {
                var c = cert.join("\n");
                ca.push(c);
                cert = [];
            }
          }
        }
        options.ca = ca;
    }
    return options;
}

run = function() {
  if (server) {
    server.close();
  }

  configApp(args[0]);

  function forward(req, res) {
        var port = getPort(req);
        proxy.web(req, res, {
          target: "http://localhost:"+port,
        },function(e){
          log_error(e,req);
      });
  }

  function signIn(req, res) {
      var host = null;
      if (config.server.ssl)
        host = "https://" + config.server.host + ":"+ config.server.ssl;
      else
        host = "http://" + config.server.host + ":"+ config.server.nonssl;

      var url = host + "/sign-in?RETURNTO="+encodeURI(req.url);
      res.writeHead(307, { location: url});
      res.end();
  }

  function mustLogin(firstPart, req, res) {
      var cookies = new Cookies(req, res);

      function checkCredentials(cache, gateway_token) {
         if (gateway_token)
           try {
               var gateway_credentials = JSON.parse(gateway_token);
               var obj = JSON.parse(gateway_credentials.json);


               if ( obj.collaborations.indexOf(firstPart) >= 0) {

                   var signature = hash( gateway_credentials.json );
                   if ( signature == gateway_credentials.signature ) {
                       if (cache) console.log("credentials cached");
                       return true;
                   }
               }
           } catch (err) {
               console.log("credential failure" , err);
               console.log("gateway_token" , gateway_token);
               console.log("gateway_credentials" , gateway_credentials);
           }
         return false;
      }

      function requestCredentials() {
        var options = {
          method: 'GET',
          path: '/medbookUser',
          port: final,
          headers: { 'cookie': req.headers.cookie, },
          keepAlive: true,
          keepAliveMsecs: 3600000, // an hour
         };
         var medbookUserReq = http.request(options, function(medbookUserRes) {
               medbookUserRes.setEncoding('utf8');
               var all = "";
               medbookUserRes.on("data", function(data) { all += data; });
               medbookUserRes.on("end", function(data) {
                   if (data != null) all += data;
                   var gateway_credentials = { signature: hash( all ), json: all, }
                   var gateway_token = JSON.stringify(gateway_credentials);
                   cookies.set("gateway_token", gateway_token);
                   if (checkCredentials(false, gateway_token))
                       forward(req, res);
                   else
                       signIn(req, res);
               });
         });
        medbookUserReq.on("error", function(err) {
             signIn(req, res);
        });
        medbookUserReq.end();
      }; // requestCredentials()

      if (checkCredentials(true, cookies.get("gateway_token")))
         forward(req, res);
      else
         requestCredentials();
  } // mustLogin

  function main(req, res) {
    if (req.url == "/menu")
        return serveMenu(req, res);
    /*
    if (req.url.indexOf("/journalentry") == 0 || req.url.indexOf("/public") == 0)
        return serveFile(req, res);
    */

    var urlPath = req.url.split("/");
    var firstPart = "never match";
    if (urlPath && urlPath.length >= 2 && urlPath[1].length > 0)
        firstPart = urlPath[1];

    var sla = "/" + firstPart;

    if (sla in routes && auth[sla]) {
        mustLogin(firstPart, req, res);
    } else
        forward(req, res);
  } // main

  if (config.server.ssl)
      server = require('https').createServer(readSSLcredentials(), main);
  else
      server = require('http').createServer(main);

  var httpProxy = require('http-proxy')
  var proxy = httpProxy.createProxy({ ws : true });

  server.on('upgrade',function(req,res){
    var port = getPort(req);
    proxy.ws(req, res, {
      target: "http://localhost:" + port,
    },function(e){
      log_error(e, req);
    });
  })
   
  if (config.server.ssl) {
      console.log("ssl listening on", config.server.ssl);
      server.listen(config.server.ssl)
  } else {
      console.log("nonssl listening on", config.server.nonssl);
      server.listen(config.server.nonssl)
  }
};

splitHostPort = function(s) {
  var parts, ret;
  parts = s.split(':', 2);
  ret = {
    host: parts[0]
  };
  if (parts.length > 1) {
    ret.port = parseInt(parts[1], 10);
  } else {
    ret.port = 80;
  }
  return ret;
};

var configuration = null;
var routes = null;
var auth = null;
var final = null;
var config = null;

configApp = function(path) {
  try {
    config = toml.parse(fs.readFileSync(path));
  } catch (_error) {
    console.log("Failed to parse configuration file " + path);
    return process.exit(1);
  }

  var appName, ca, link, menu, menuItem, _ref;
  menu = [];
  routes = {};
  auth = {};
  final = config.final.port

  _ref = config.apps;
  for (appName in _ref) {
    var ca = _ref[appName];
    routes[ca.route] = ca.port;
    auth[ca.route] = ca.auth;
  }

};

serveMenu = function(req, res) {
  var menu = [];
  _ref = config.apps;
  var routeHacks = "";
  for (appName in _ref) {
    var ca = _ref[appName];
    menuItem = String(ca.menuItem);
    if (menuItem === null) {
      menuItem = ca.route;
    }
    menuItem = menuItem.replace(/\ /g, "&nbsp;");
    link = "<a target='_self' class='MedBookLink' href='" + ca.route + "'>" + menuItem + "</a>";
    routeHacks += "Router.route('" + ca.route + "', function () {}, {where: 'server'});\n";
    if (ca.menuItem) {
      if (ca.menuPosition !== void 0) {
        menu.splice(ca.menuPosition, 0, link);
      } else {
        menu.push(link);
      }
    }
  }

  var text = String(menuFile).replace("LIST", (menu.map(function(a) {
    return "<li>" + a + "</li><br/>";
  })).join(''));

  text += "<script>if (Router) {\n" + routeHacks + "}\n</script>";


  res.writeHead(200);
  res.write(text, "binary");
  return res.end();
};



var mimeTypes = {
    "html": "text/html",
    "jpeg": "image/jpeg",
    "jpg": "image/jpeg",
    "png": "image/png",
    "js": "text/javascript",
    "css": "text/css"};

        
function serveFile(req, res) {
    var uri = url.parse(req.url).pathname;
    var filename = path.join(process.cwd(), uri);
    fs.exists(filename, function(exists) {
        if(!exists) {
            console.log("not exists: " + filename);
            res.writeHead(404, {'Content-Type': 'text/plain'});
            res.end();
            return;
        }
        var mimeType = mimeTypes[path.extname(filename).split(".")[1]];
        res.writeHead(200, mimeType);

        var fileStream = fs.createReadStream(filename);
        fileStream.pipe(res);

    }); //end fs.exists

};

console.log("watching", args[0]);

fs.watchFile(args[0], run);
fs.watchFile("menu.html", readMenu);

function log_error(e,req){
  if(e){
    /*
    console.log("log_error");
    console.error(e.message);
    console.log(req.headers.host,'-->');
    console.log('-----');
    */
  }
}

run();

