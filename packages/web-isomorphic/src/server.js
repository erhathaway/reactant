import '@babel/polyfill';
import express from 'express';
import log, { setLevel } from '@reactant/core/log';
import ora from 'ora';
import path from 'path';
import { __express as ejs } from 'ejs';
import { config } from '@reactant/core';
import { createServer } from 'http';

if (config.options.verbose) setLevel('verbose');
if (config.options.debug) setLevel('debug');

let errorApp = null;
let serverError = false;
let serverSpinner = ora('starting server').start();

if (module.hot) {
  errorApp = express();
  errorApp.disable('x-powered-by');
  errorApp.set('views', path.resolve(__dirname, 'views'));
  errorApp.set('view engine', 'ejs');
  errorApp.engine('.ejs', ejs);
  errorApp.use(express.static(path.resolve(__dirname, 'views')));
  errorApp.use((req, res) => {
    return res.render('error', { config, errStack: req.err.stack });
  });
}

async function init() {
  const app = await createApp();
  const server = createServer(app);
  startServer(server);
  return app;
}

async function createApp() {
  const { app } = await require('@reactant/web-isomorphic/server').default;
  app.disable('x-powered-by');
  app.use((err, req, res, _next) => {
    if (err) {
      log.error(err.stack);
      if (module.hot) {
        serverError = true;
        req.err = err;
        return errorApp.handle(req, res);
      }
      return res.status(500).send('Server error');
    }
    return res.status(404).send('Page not found');
  });
  return app;
}

function startServer(server) {
  const { platform } = config;
  server.listen(config.port, config.host, err => {
    if (err) throw err;
    serverSpinner.succeed(`server listening on port ${config.port}`);
    if (module.hot) {
      module.hot.accept(`~/../${platform}/server.js`, () => {
        log.info('[HMR] updating HMR');
        if (serverError) {
          serverError = false;
          serverSpinner = ora('restarting server');
          server.close(() => {
            const app = createApp();
            const newServer = createServer(app);
            startServer(newServer);
          });
        }
      });
      log.info('[HMR] server HMR enabled');
    }
  });
}

export default init();
