let hostedData = [];

function getData(dataSets, key) {
  key = key.replace(/\/$/, '');
  let set = dataSets.find(data => data[key] !== undefined);
  return set ? set[key] : {};
}

function startServer(dataSets, port) {
  hostedData = dataSets;
  const express = require('express');
  const app = express();
  const cors = require('cors');
  const http = require('http');
  const server = http.createServer(app);
  app.use(cors());
  app.all('*', (req, res) => {
    let key = req.method.toUpperCase() + '|' + req.url;
    let data = getData(hostedData, key);
    if (data.headers) {
      delete data.headers['content-encoding'];
      res.set(data.headers);
    }
    res.send(data.data);
  });
  server.on('error', e => {
    if (e.code === 'EADDRINUSE') {
      console.log(`\nError: port ${port} in use.`);
      process.exit(1);
    } else {
      throw error;
    }
  });
  server.listen(port, () => {
    console.log(`Server started at http://localhost:${port}\n`);
  });
}

function updateHostedData(newData) {
  hostedData = newData;
}

exports.updateHostedData = updateHostedData;
exports.startServer = startServer;
