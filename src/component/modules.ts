import { Engine } from '..';
import { Component } from './index';
import { ApplicationError } from '../error';

let logger;

export class Modules implements Component {
  private modules = [];
  private _conf;

  constructor(private engine: Engine) {
    logger = engine.log.log('engine:modules');
    this._conf = this.engine.configuration.get('modules');
  }

  /**
   * Find and return instance of a module. Module is looked up in all module paths
   * all modules are cached, the instances are not cached
   * @param {string} name
   * @param user
   * @returns void
   */
  module(name: string, user?) {
    const loadList = this.modules.slice();
    const module = this.load(loadList, name);
    if (!module) {
      throw new ApplicationError('system_error', `Module ${name} not found`, '5167550557');
    }
    return new module(this.engine, user);
  }

  private load(sources: Array<string>, resource: string) {
    if (!sources || sources.length === 0) {
      throw new ApplicationError('invalid_request', `Couldn't dynamically load ${resource}`, 'sys_en_lo');
    }

    logger.debug('Loading: ' + resource + ' from ' + sources[0] + '/' + resource);

    try {
      const loaded = require(sources[0] + '/' + resource);
      return loaded.default;
    } catch (ex) {
      if (ex.code === 'MODULE_NOT_FOUND') {
        return this.load(sources.slice(1), resource);
      }
      logger.error(ex);
      throw ex;
    }
  }

  async init(): Promise<any> {
    logger.info('Initialising modules');
    if (!this._conf) {
      logger.debug('No modules to configure');
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const root = this.engine.configuration.get('system').root;

      for (const module of this._conf) {
        this.modules.push(root + module);
        logger.info(`Registering module ${root + module}`);
      }

      const modlist = [];
      const fs = require('fs');
      for (const src of this.modules) {
        fs.readdirSync(src).forEach((item) => {
          if (item.indexOf('.js') === item.length - 3) {
            const instance = require(src + '/' + item);

            if (instance.default) {
              const initialised = instance.default(this.engine, this.engine.systemUser);
              if (initialised && initialised.init) {
                modlist.push(initialised);
              }
            }
          }
        });

        return modlist
          .reduce((promise, mod) => {
            return promise.then(() => {
              return mod.init();
            });
          }, Promise.resolve())
          .then((result) => {
            return resolve(this);
          });
      }
    });
  }

  async release(): Promise<any> {
    return Promise.resolve();
  }
}
