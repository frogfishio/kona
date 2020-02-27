import { Component } from './component/index';
import { ApplicationError } from './error';

// Components
import { Configuration } from './component/configuration';
import { Logger } from './component/logger';
import { Modules } from './component/modules';
import { Services } from './component/services';
import { Heartbeat } from './component/heartbeat';
import { Memory } from './component/memory';
import { Files } from './component/file';
import { Listener } from './component/listener';
import { Events } from './component/events';
import { Cache } from './component/cache';
import { Token } from './component/token';
import { Role } from './component/role';
import { User } from './component/user';
import { Connector } from './component/connector';
import { Responder } from './component/responder';
import { Email } from './component/email';
import { Template } from './component/template';
import { Scheduler } from './component/scheduler';
import { Init } from './component/init';
import { DB } from './component/db/index';
import { Session } from './component/session';
import { Manifest } from './component/manifest';
import { Account } from './component/account';
import { Audit } from './component/audit';
import { Auth } from './component/auth';
import { MongoDBProtocol } from './component/db/mongo';
import { Links } from './component/links';
import { Authenticator, Authoriser } from './types';
import { MasterData } from './component/master';
import { Registry } from './component/registry';

let logger;
// const debug = require('debug')('engine');

export class Engine {
  private _instanceId = require('uuid').v4();
  private _configuration: Configuration;
  private _log: Logger;
  private _modules: Modules;
  private _services: Services;
  private _heartbeat: Heartbeat;
  private _memory: Memory;
  private _db: DB;
  private _links: Links;
  private _listener: Listener;
  private _events: Events;
  private _cache: Cache;
  private _token: Token;
  private _connectors: Connector;
  private _files: Files;
  private _responder: Responder;
  private _email: Email;
  private _template: Template;
  private _scheduler: Scheduler;
  private _session: Session;
  private _manifest: Manifest;
  private _account: Account;
  private _audit: Audit;
  private _role: Role;
  private _user: User;
  private _auth: Auth;
  private _master: MasterData;
  private _init: Init; // special case can't be accessed externally
  private _apm;
  private _registry: Registry;

  get id() {
    return this._instanceId;
  }

  get configuration() {
    return this._configuration;
  }

  get heartbeat() {
    return this._heartbeat;
  }

  get modules() {
    return this._modules;
  }

  get log() {
    return this._log;
  }

  get services() {
    return this._services;
  }

  get memory() {
    return this._memory;
  }

  get db() {
    if (!this._db) {
      throw new Error('Tryng to access uninitialised database');
    }
    return this._db;
  }

  get links() {
    return this._links;
  }

  get files() {
    return this._files;
  }

  get events() {
    return this._events;
  }

  get cache() {
    return this._cache;
  }

  get token(): Token {
    return this._token;
  }

  get connectors(): Connector {
    return this._connectors;
  }

  get responder(): Responder {
    return this._responder;
  }

  get email(): Email {
    return this._email;
  }

  get template(): Template {
    return this._template;
  }

  get scheduler(): Scheduler {
    return this._scheduler;
  }

  get session(): Session {
    return this._session;
  }

  get manifest(): Manifest {
    return this._manifest;
  }

  get account(): Account {
    return this._account;
  }

  get audit(): Audit {
    return this._audit;
  }

  get role(): Role {
    return this._role;
  }

  get user(): User {
    return this._user;
  }

  get auth(): Auth {
    return this._auth;
  }

  get master(): MasterData {
    return this._master;
  }

  get apm() {
    return this._apm;
  }

  get registry() {
    return this._registry;
  }

  private manageable: Array<Component> = [];

  constructor(private configPath: string, private override?: any) {
    if (override && override.apm) {
      const apmconf = {
        serviceName: override.service || 'engine',
        secretToken: '',
        serverUrl: override.apm // || 'http://localhost:8200' //'http://host.docker.internal:8200'
      };
      console.log(
        `Created engine with APM ${apmconf.serviceName} sending to ${apmconf.serverUrl}`
      );
      this._apm = require('elastic-apm-node').start(apmconf);
    }
  }

  get systemUser() {
    const sysconf = this._configuration.get('system') || {};
    return {
      id: sysconf.user || '_system',
      account: sysconf.account || '_system',
      permissions: sysconf.permissions || ['_system', 'admin']
    };
  }

  async authenticate(request: any) {
    const config = this.configuration.get('auth');
    if (!config || !config.authenticator) {
      throw new ApplicationError(
        'system_error',
        `Authenticator not configured`,
        '5939792437'
      );
    }

    try {
      const authenticator: Authenticator = this.modules.module(
        config.authenticator,
        this.systemUser
      );
      return authenticator.authenticate(request);
    } catch (err) {
      throw err;
    }
  }

  async authorise(user: any) {
    const config = this.configuration.get('auth');
    if (!config || !config.authoriser) {
      throw new ApplicationError(
        'system_error',
        `Authoriser not configured`,
        '4143639573'
      );
    }

    try {
      const authoriser: Authoriser = this.modules.module(
        config.authoriser,
        this.systemUser
      );
      return authoriser.authorise(user);
    } catch (err) {
      throw err;
    }
  }

  private load(component: string): Component {
    switch (component) {
      case 'modules':
        this._modules = new Modules(this);
        return this._modules;
      case 'services':
        this._services = new Services(this);
        return this._services;
      case 'events':
        this._events = new Events(this);
        return this.manage(this._events);
      case 'heartbeat':
        this._heartbeat = new Heartbeat(this);
        return this.manage(this._heartbeat);
      case 'scheduler':
        this._scheduler = new Scheduler(this);
        return this.manage(this._scheduler);
      case 'memory':
        this._memory = new Memory(this);
        return this.manage(this._memory);
      case 'cache':
        this._cache = new Cache(this);
        return this.manage(this._cache);
      case 'file':
        this._files = new Files(this);
        return this.manage(this._files);
      case 'token':
        this._token = new Token(this);
        return this.manage(this._token);
      case 'session':
        this._session = new Session(this);
        return this.manage(this._session);
      case 'manifest':
        this._manifest = new Manifest(this);
        return this.manage(this._manifest);
      case 'connector':
        this._connectors = new Connector(this);
        return this.manage(this._connectors);
      case 'roles':
        this._role = new Role(this);
        return this.manage(this._role);
      case 'account':
        this._account = new Account(this);
        return this.manage(this._account);
      case 'audit':
        this._audit = new Audit(this);
        return this.manage(this._audit);
      case 'user':
        this._user = new User(this);
        return this.manage(this._user);
      case 'auth':
        this._auth = new Auth(this);
        return this.manage(this._auth);
      case 'email':
        this._email = new Email(this);
        return this.manage(this._email);
      case 'templates':
        this._template = new Template(this);
        return this.manage(this._template);
      case 'init':
        this._init = new Init(this);
        return this.manage(this._init);
      case 'responder':
        this._responder = new Responder(this);
        return this.manage(this._responder);
      case 'master':
        this._master = new MasterData(this);
        return this.manage(this._master);
      case 'registry':
        this._registry = new Registry(this);
        return this.manage(this._registry);
      case 'db':
        switch (this._configuration.get('db').type) {
          case 'mongo':
            this._db = new MongoDBProtocol(this);
            return this.manage(this._db);
          default:
            throw new ApplicationError(
              'system_error',
              `Invalid database type ${
                this._configuration.get('data').type
              } configured`,
              '7159960532'
            );
        }
      case 'links':
        this._links = new Links(this);
        return this.manage(this._links);
      default:
        logger.emergency(`Invalid system component requested ${component}`);
        break;
    }
  }

  async init(): Promise<any> {
    let loadList = [];

    this._configuration = new Configuration(this.configPath, this.override);
    return this._configuration
      .init()
      .then(() => {
        this._log = new Logger(this._configuration.get('system'));
        logger = this._log.log('engine');
        return Promise.resolve();
      })
      .then(() => {
        // Init sequence is important
        logger.info(
          `Engine initialising [${
            this.configuration.get('system').id
          }] with root ${this.configuration.get('system').root}`
        );

        // Test and create system folders where necessary
        if (this.configuration.get('system').folders) {
          const fs = require('fs');
          logger.info('Checking folders');

          for (const folder of this.configuration.get('system').folders) {
            let partial = '';
            for (const part of folder.split('/')) {
              partial += '/' + part;
              if (!fs.existsSync(partial)) {
                fs.mkdirSync(partial);
              }
            }
            logger.info(`Folder ${folder} OK`);
          }
        }

        // Initialse system components
        logger.info('Initialising system components');
        loadList = ['events', 'heartbeat'];

        if (this._configuration.get('memory')) {
          loadList.push('memory');

          loadList.push('manifest');
          // Load session if memory is enabled
          // TODO: add session config
          loadList.push('session');
        }

        if (this._configuration.get('cache')) {
          loadList.push('cache');
        }

        if (this._configuration.get('services')) {
          loadList.push('services');
        }

        if (this._configuration.get('registry')) {
          loadList.push('registry');
        }

        if (this._configuration.get('db')) {
          loadList.push('db');
          loadList.push('audit');
          loadList.push('links');
          loadList.push('account');
          loadList.push('master');
        }

        loadList.push('modules');

        if (this._configuration.get('file')) {
          loadList.push('file');
        }

        if (this._configuration.get('connectors')) {
          loadList.push('connector');
        }

        if (this._configuration.get('auth')) {
          loadList.push('auth');
          loadList.push('token');
        }

        if (this._configuration.get('email')) {
          loadList.push('email');
        }

        if (this._configuration.get('templates')) {
          loadList.push('templates');
        }

        if (this._configuration.get('roles')) {
          loadList.push('roles');
        }

        if (this._configuration.get('user')) {
          loadList.push('user');
        }

        if (this._configuration.get('responder')) {
          loadList.push('responder');
        }

        if (
          this._configuration.get('db') &&
          this._configuration.get('scheduler')
        ) {
          loadList.push('scheduler');
        }

        // after all is loaded run external init
        if (this._configuration.get('init')) {
          loadList.push('init');
        }

        return loadList
          .reduce((promise, componentName) => {
            return promise.then(() => {
              logger.info(`Loading ${componentName}`);
              return this.load(componentName).init();
            });
          }, Promise.resolve())
          .then(() => {
            if (this.services || this.registry) {
              this._listener = new Listener(this);
              this.manage(this._listener);
              return this._listener.init();
            } else if (this.configuration.get('system').run) {
              if (this.configuration.get('system').run === 'forever') {
                logger.info('Running forever');
                return new Promise((resolve, reject) => {
                  setInterval(() => {}, 60000);
                });
              } else {
                const runner = require(this.configuration.get('system').run);
                logger.info(`Runner: ${runner}`);
                runner.default(this).then(() => {
                  logger.info('Runner completed');
                  process.exit(0);
                });
              }
            } else {
              return Promise.reject('No service or run system specified');
            }
          })
          .catch(err => {
            logger.emergency(err);
            process.exit(1);
          });
      });
  }

  release() {
    logger.info('Releasing system');

    return this.manageable.reverse().reduce((promise, component) => {
      return promise.then(() => {
        return component.release();
      });
    }, Promise.resolve());
  }

  manage(component: Component): Component {
    this.manageable.push(component);
    return component;
  }
}
