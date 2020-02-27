import { ApplicationError } from '../error';
import { Component } from './index';
import { Engine } from '..';
import { TreeNode } from '../util/tree';

let logger;

export class Registry implements Component {
  private _conf;
  private _root;
  private _swaggerParser = require('swagger-parser');
  private _registry = new TreeNode();

  constructor(private engine: Engine) {
    logger = engine.log.log('engine:registy');
    this._conf = engine.configuration.get('registry');
    this._root = this.engine.configuration.get('system').root;
  }

  async init(): Promise<any> {
    for (const name of Object.getOwnPropertyNames(this._conf.services)) {
      logger.debug(`Initialising ${name} service`);
      await this.service(name, this._conf.services[name]);
    }

    logger.info('Initialised');
    return Promise.resolve();
  }

  async release(): Promise<any> {
    return Promise.resolve();
  }

  resolve(request) {
    return this._registry.resolve(request);
  }

  private async service(name, conf) {
    logger.debug(`Loading ${conf.name}`);

    const specs = [];
    for (const spec of conf.specs) {
      specs.push(await this.spec(this._root + spec));
    }

    logger.debug(`All service specs are valid`);
    logger.debug(`Loading service handlers`);

    for (const spec of specs) {
      this.initService(spec, conf.handlers);
    }
    logger.debug('All service handlers loaded');

    if (conf.configuration) {
      logger.debug(`Registering service configuration for ${name}`);
      this.engine.configuration.set(name, conf.configuration);
    }

    if (conf.register) {
      logger.debug('Registering service with ' + this._root + conf.register);
      const reg = require(this._root + conf.register);
      await reg(this.engine, conf.configuration);
    }
  }

  private async spec(path): Promise<any> {
    return new Promise((resolve, reject) => {
      logger.debug(`Validating service spec ${path}`);
      this._swaggerParser.validate(path, (err, data) => {
        if (err) {
          logger.error(err);
          return reject(
            new ApplicationError(
              'system_error',
              `Service validation error for ${path}`,
              'sys_reg_inval'
            )
          );
        }

        return resolve(data);
      });
    });
  }

  private initService(service, handlers) {
    const re = /\{[0-9a-zA-Z_\-]*}/;
    const paths = Object.getOwnPropertyNames(service.paths);

    for (let j = 0; j < paths.length; j++) {
      const path =
        service.basePath === '/' ? paths[j] : service.basePath + paths[j];
      const parts = path.split('/').splice(1);
      let loadpath = '';

      for (let n = 0; n < parts.length; n++) {
        if (!parts[n].match(re)) {
          loadpath += '/' + parts[n];
        }
      }

      const methods = {};
      for (const method of Object.getOwnPropertyNames(
        service.paths[paths[j]]
      )) {
        methods[method] = {
          security: service.paths[paths[j]][method].security
        };
      }

      const handler = this.loadHandler(handlers, loadpath);

      if (!handler) {
        throw new ApplicationError(
          'system_error',
          `Handler for path ${loadpath} not found`,
          'sys_srv_lh'
        );
      }

      this._registry.add(parts, {
        method: methods,
        handler: handler,
        definitions: { security: service.securityDefinitions }
      });
    }
  }

  private loadHandler(sources: Array<string>, resource: string) {
    if (!sources || sources.length === 0) {
      return null;
    }

    try {
      const loadFile = this._root + sources[0] + resource;
      logger.debug('Trying to load handler: ' + resource + ' from ' + loadFile);
      const loaded = require(loadFile);
      logger.info(`Handler ${resource} loaded`);
      return loaded.default;
    } catch (ex) {
      if (ex.code === 'MODULE_NOT_FOUND') {
        if (sources.length === 1) {
          logger.error(
            `Unable to resolve ${resource} in any of the provided paths`
          );
          return null;
        }
        return this.loadHandler(sources.slice(1), resource);
      }

      throw ex;
    }
  }
}
