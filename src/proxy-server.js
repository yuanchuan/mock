const fs = require('fs');
const chalk = require('chalk');
const request = require('superagent');
const libUrl  = require('url');
const { join, basename } = require('path');
const Cache = require('./cache');

function proxy(url) {
  let parsedURL = libUrl.parse(url);
  let { port, hostname, path, protocol = 'https:' } = parsedURL;
  if (port) {
    hostname += ':' + port;
  }
  let prefix = protocol + '//' + (hostname || '') + (path || '');
  return function(method, { query, data, headers, path }) {
    let urlPath = new libUrl.URL(path, prefix).href;
    console.log(
      chalk.green(method),
      chalk.gray(urlPath)
    );
    headers.host = headers.origin = (hostname || url);
    return request(method, urlPath)
      .set(headers)
      .query(query)
      .send(data)
  }
}

function parseEnv(content) {
  let mapping = new Map();
  let lines = content.split(/\n+/).filter(n => {
    if (!n) return false;
    if (/^#/.test(n)) return false;
    if (/=/.test(n)) return true;
  });
  lines.forEach(line => {
    let [name, ...value] = line.split(/=/).map(n => n.trim().replace(/^["']|["']$/g, ''));
    mapping.set(name, value.join(''));
  });
  return Array.from(mapping);
}

function getUrlFromEnv(name) {
  try {
    let config = fs.readFileSync(name, 'utf8');
    let parsed = parseEnv(config);
    let [_, url] = parsed.find(([name, value]) => /API/i.test(name))
    return url;
  } catch (e) {}
}

function startServer(url, port, cacheFile) {
  const express = require('express');
  const bodyParser = require('body-parser')
  const app = express();
  const cors = require('cors');
  const http = require('http');
  const server = http.createServer(app);

  if (basename(url).startsWith('.env.')) {
    let envUrl = getUrlFromEnv(url);
    if (!envUrl) {
      console.log(chalk.red('\nError:'), 'No proxy found.');
      process.exit(1);
    } else {
      url = envUrl;
    }
  }

  let proxyRequest = proxy(url);
  let cache = new Cache(cacheFile);

  app.use(bodyParser.json())
  app.use(cors());
  app.all('*', (req, res) => {
    proxyRequest(req.method, {
      path: req.path,
      query: req.query,
      data: req.body,
      headers: req.headers
    }).then(result => {
      let headers = {...result.headers};
      delete headers['content-encoding'];
      res.set(headers);
      cache.sync(req, result);
      res.send(result.text || result.body);
    }).catch(e => {
      let result = e.response;
      let resText = result.text || result.body || e.message || e.toString();
      res.status(e.status || 500).send(resText);
    });
  });
  server.on('error', e => {
    if (e.code === 'EADDRINUSE') {
      console.log(chalk.red('\nError:'), `port ${port} in use.`);
      process.exit(1);
    }
  });
  server.listen(port, () => {
    console.log(`Proxy server started at http://localhost:${port}`);
    console.log(`Use proxy: ${chalk.yellow(url)}\n`);
  });
}

exports.startProxyServer = startServer;
