const fs = require('fs');

const chalk = require('chalk');
const request = require('superagent');
const libUrl  = require('url');
const { join, basename } = require('path');
const Cache = require('./cache');

function proxy(method, url, { query, data, headers, path }) {
  let { full, hostname } = normizeUrl(url);
  let urlPath = new libUrl.URL(path, full).href;
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
    return parsed.filter(([name, value]) => /API/i.test(name))
      .map(n => n[1]);
  } catch (e) {}
}

function normizeUrl(url) {
  let parsedURL = libUrl.parse(url);
  let { port, hostname, path, protocol } = parsedURL;
  if (port) {
    hostname += ':' + port;
  }
  return {
    full: `${protocol||'http:'}//${hostname||''}${path||''}`,
    hostname
  }
}

function startServer(url, port, cacheFile) {
  const express = require('express');
  const bodyParser = require('body-parser')
  const app = express();
  const cors = require('cors');
  const http = require('http');
  const server = http.createServer(app);

  if (basename(url).startsWith('.env')) {
    let envUrl = getUrlFromEnv(url);
    if (envUrl?.length) {
      url = envUrl;
    } else {
      console.log(chalk.red('\nError:'), 'No proxy found.');
      process.exit(1);
    }
  }

  if (!Array.isArray(url)) {
    url = [url];
  }

  let cache = new Cache(cacheFile);

  app.use(bodyParser.json())
  app.use(cors());
  app.all('*', (req, res) => {
    let actualURL = req.headers['x-forwarded-for'] || url[0];
    let proxyHost = libUrl.parse(actualURL).host;
    if (proxyHost === req.headers.host) {
      actualURL = url[0];
      proxyHost = libUrl.parse(actualURL).host;
    }
    if (proxyHost === req.headers.host) {
      console.log(
        chalk.red('\nError:'),
        `The local and proxy server ${proxyHost} are identical!`
      );
      return res.send({});
    }
    proxy(req.method, actualURL, {
      path: req.path,
      query: req.query,
      data: req.body,
      headers: req.headers
    }).then(result => {
      let headers = {...result.headers};
      delete headers['content-encoding'];
      res.set(headers);
      res.send(result.text || result.body);
      cache.sync(req, result);
    }).catch(e => {
      let result = e.response || {};
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
    console.log(`Targets: ${chalk.yellow(url.join(', '))}\n`);
  });
}

exports.startProxyServer = startServer;
