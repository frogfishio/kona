#!/usr/bin/env node
import { Engine } from './index';
const program = require('commander');

/**
 * Logging plan:
 * info: <engine identifier> application(lovecroatia) environment(prod) module(default) @tag Message...
 */

program
  .version('2.3.0')
  .option('-c, --config [engine.yaml]', 'Specify configuration file [configfile]')
  .option('--root [path]', 'Specify application root [path]')
  .option('--debug', 'Run in debug mode')

  .option('--env [env]', 'Specify service environment [env]')
  .option('--tenant [tenat]', 'Specify service tentnt [tentnt]')
  .option('--app [app]', 'Specify application name [app]')
  .option('--tag [tag]', 'Tag this application')
  .option('--live', 'This is a live deployment')

  .option('--apm [apm]', 'Specify apm URL [apm]')
  .option('--service [service]', 'The service name used with APM [service]')
  .option('--run [file]', 'Runs [file] after initialisation of engine')
  .parse(process.argv);

if (!program.config) {
  console.error('Configuration file not specified');
  process.exit(1);
}

let logger;

const params: {
  debug;
  root;
  live;

  env;
  tenant;
  app;
  tag;
  service;

  apm;
  run;
} = program;

// const xparams: any = {
//   debug: program.debug,
//   root: program.root,
//   live: program.live,

//   env: program.live,
//   tenant: program.live,
//   name: program.live,
//   tag: program.tag,

//   apm: program.apm,
//   run: program.run
// };

// if (program.apm === true) {
//   params.apm = {
//     enabled: program.apm,
//     name: program.apmName,
//     url: program.apmUrl
//   };
// }

start();

async function start() {
  const engine = new Engine(program.config, params);
  engine
    .init()
    .then(() => {
      logger = engine.log.log('system');
      process.on('uncaughtException', function(err) {
        console.error(err);
        logger.emergency(err);
        process.exit(1);
      });
    })
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}
