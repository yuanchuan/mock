#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const watch = require('node-watch')
const chalk = require('chalk');
const { program } = require('commander');

const { startServer, updateHostedData } = require('./server');
const { startProxyServer } = require('./proxy-server');

let defaultPort = 3456;

program.version(require('../package').version);

program
  .arguments('[data]')
  .option('-p, --port <port>', `server port (default: ${defaultPort})`)
  .option('-P, --proxy <proxy>', 'start proxy server from url or .env file')
  .option('-s, --save <save>', 'save requests to local data file')
  .action(run)
  .parse();

function run(source, options) {
  if (options.save) {
    fs.ensureFileSync(options.save);
  }
  if (options.proxy) {
    return startProxyServer(
      options.proxy,
      options.port || defaultPort,
      options.save
    );
  }

  if (!source) {
    source = './';
  }

  if (!fs.existsSync(source)) {
    console.log(`\n'${source}' does not exist.`);
    process.exit(1);
  }
  let dataSets = getDataSets(source);

  if (!dataSets.length) {
    console.log('\nNo data found.');
    process.exit(1);
  }

  startServer(dataSets, options.port || defaultPort);
  watch(source, () => {
    updateHostedData(getDataSets(source));
  });
}

function readJSON(file) {
  let result = {};
  try {
    /* Simple and cache free */
    result = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'))
  } catch (e) {
    console.log(chalk.red('skip'), chalk.gray(file));
    return null;
  }
  console.log(chalk.green('loaded'), chalk.gray(file));
  return result;
}

function getDataSets(dataSource) {
  let dataSets = [];
  // single data file
  if (isFile(dataSource)) {
    dataSets = [readJSON(dataSource)];
  }
  // read from a directory
  else if (isDirectory(dataSource)) {
    dataSets = fs.readdirSync(dataSource)
      .map(n => path.join(dataSource, n))
      .filter(n => isFile(n) && /\.json$/.test(n))
      .map(n => readJSON(n))
  }
  return dataSets.filter(Boolean);
}

function isFile(name) {
  return checkStat(name, n => fs.statSync(n).isFile());
}

function isDirectory(name) {
  return checkStat(name, n => fs.statSync(n).isDirectory());
}

function checkStat(name, fn) {
  try {
    return fn(name);
  } catch (err) {
    if (/^(ENOENT|EPERM|EACCES)$/.test(err.code)) {
      if (err.code !== 'ENOENT') {
        console.warn('Warning: Cannot access %s', name);
      }
      return false;
    }
    throw err;
  }
}
