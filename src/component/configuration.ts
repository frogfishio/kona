import { Component } from './index';

export class Configuration implements Component {
  private conf = {};

  constructor(private configPath: string, private override?: any) {}

  get(name: string) {
    return this.conf[name] || {};
  }

  set(name: string, value: any) {
    this.conf[name] = value;
  }

  init(): Promise<any> {
    return new Promise((resolve, reject) => {
      const yaml = require('js-yaml');
      const fs = require('fs');

      // console.log(`DIRNAME: ${__dirname}`);
      try {
        this.conf = Configuration.environment(yaml.safeLoad(fs.readFileSync(this.configPath, 'utf8')));

        // Process overrides
        if (this.override) {
          if (this.override.root) {
            this.conf['system'].root = this.override.root;
          }
          if (this.override.run) {
            this.conf['system'].run = this.override.run;
          }
          this.conf['system'].env = this.override.env;
          this.conf['system'].tenant = this.override.tenant;
          this.conf['system'].app = this.override.app;
          this.conf['system'].tag = this.override.tag;
          this.conf['system'].live = this.override.live;

          if (this.override.debug) {
            this.conf['log'].level = 'debug';
          }
        }

        // Root adjustments
        if (!this.conf['system'].root) {
          this.conf['system'].root = this.root();
        } else {
          if (this.conf['system'].root.charAt(0) !== '/') {
            this.conf['system'].root = this.root() + '/' + this.conf['system'].root;
          }
        }

        // console.log(
        //   `***[Configuration]***********************\n${JSON.stringify(
        //     this.conf
        //   )},***[/Configuration]**********************`
        // );
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  release(): Promise<any> {
    return Promise.resolve();
  }

  private root() {
    const root = __dirname.split('/');
    return root.splice(0, root.length - 1).join('/');
  }

  private static environment(conf: any) {
    conf.system.service_prefix = process.env.SERVICE_PREFIX || '';
    console.log(`SPF = ${process.env.SERVICE_PREFIX}`);

    conf.system.id = process.env.ENGINE_SYSTEM_ID ? process.env.ENGINE_SYSTEM_ID : conf.system.id;

    conf.system.listen = process.env.ENGINE_SYSTEM_LISTEN ? process.env.ENGINE_SYSTEM_LISTEN : conf.system.listen;

    conf.system.port = process.env.ENGINE_SYSTEM_PORT ? parseInt(process.env.ENGINE_SYSTEM_PORT) : conf.system.port;

    conf.system.root = process.env.ENGINE_SYSTEM_ROOT ? process.env.ENGINE_SYSTEM_ROOT : conf.system.root;

    conf.system.env = process.env.ENGINE_SYSTEM_ENV ? process.env.ENGINE_SYSTEM_ENV : conf.system.env;

    conf.system.tenant = process.env.ENGINE_SYSTEM_TENANT ? process.env.ENGINE_SYSTEM_TENANT : conf.system.tenant;

    conf.system.app = process.env.ENGINE_SYSTEM_APP ? process.env.ENGINE_SYSTEM_APP : conf.system.app;

    conf.system.tag = process.env.ENGINE_SYSTEM_TAG ? process.env.ENGINE_SYSTEM_TAG : conf.system.tag;

    conf.system.live = process.env.ENGINE_SYSTEM_LIVE ? process.env.ENGINE_SYSTEM_LIVE : conf.system.live;

    if (process.env.ENGINE_SYSTEM_DEBUG) {
      conf.log.level = 'debug';
    }

    if (conf.memory) {
      // ENGINE_MEMORY_HOSTS
      conf.memory.segment = process.env.ENGINE_MEMORY_SEGMENT ? process.env.ENGINE_MEMORY_SEGMENT : conf.memory.segment;

      conf.memory.name = process.env.ENGINE_MEMORY_NAME ? process.env.ENGINE_MEMORY_NAME : conf.memory.name;

      conf.memory.password = process.env.ENGINE_MEMORY_PASSWORD
        ? process.env.ENGINE_MEMORY_PASSWORD
        : conf.memory.password;

      if (process.env.ENGINE_MEMORY_HOSTS) {
        if (process.env.ENGINE_MEMORY_HOSTS.indexOf(',') !== -1) {
          delete conf.memory.host;
          delete conf.memory.port;
          conf.memory.model = 'sentinel';
          conf.memory.hosts = [];
          const hosts = process.env.ENGINE_MEMORY_HOSTS.split(',');
          for (const host of hosts) {
            const parts = host.split(':');
            conf.memory.hosts.push({
              host: parts[0],
              port: parseInt(parts[1])
            });
          }
        } else {
          const parts = process.env.ENGINE_MEMORY_HOSTS.split(':');
          delete conf.memory.hosts;
          conf.memory.model = 'direct';
          conf.memory.host = parts[0];
          conf.memory.port = parseInt(parts[1]);
        }
      }
    }

    if (conf.db) {
      conf.db.name = process.env.ENGINE_DB_NAME ? process.env.ENGINE_DB_NAME : conf.db.name;

      conf.db.replicaset = process.env.ENGINE_DB_REPLICA_SET ? process.env.ENGINE_DB_REPLICA_SET : conf.db.replicaset;

      conf.db.user = process.env.ENGINE_DB_USER ? process.env.ENGINE_DB_USER : conf.db.user;

      conf.db.password = process.env.ENGINE_DB_PASSWORD ? process.env.ENGINE_DB_PASSWORD : conf.db.password;

      if (process.env.ENGINE_DB_HOSTS) {
        if (process.env.ENGINE_DB_HOSTS.indexOf(',') !== -1) {
          delete conf.db.host;
          conf.db.hosts = [];
          const hosts = process.env.ENGINE_DB_HOSTS.split(',');
          for (const host of hosts) {
            const parts = host.split(':');
            conf.db.hosts.push({ host: parts[0], port: parseInt(parts[1]) });
          }
        } else {
          delete conf.db.hosts;
          const parts = process.env.ENGINE_DB_HOSTS.split(':');
          conf.db.host = parts[0];
          conf.db.port = parseInt(parts[1]);
        }
      }
    }

    // process file configs if any
    const fileconf = {};
    for (const name of Object.getOwnPropertyNames(process.env)) {
      if (name.toLowerCase().indexOf('engine_file_') === 0) {
        const parts = name
          .toLowerCase()
          .split('_')
          .splice(2);
        if (!fileconf[parts[0]]) {
          fileconf[parts[0]] = {};
        }
        fileconf[parts[0]][parts[1]] = process.env[name];
      }
    }

    conf.file = require('../util/merge')(conf.file, fileconf);

    return conf;
  }
}
