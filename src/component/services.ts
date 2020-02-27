import { Engine } from '..';
import { ApplicationError } from '../error';
import { TreeNode } from '../util/tree';
import { Component } from './index';

let logger;

export class Services implements Component {
  private services = new TreeNode();

  constructor(private system: Engine) {
    logger = system.log.log('engine:services');
  }

  init(): Promise<any> {
    const root = this.system.configuration.get('system').root;
    const servicePaths = this.system.configuration.get('services');
    const SwaggerParser = require('swagger-parser');

    if (!servicePaths) {
      return Promise.reject(
        new ApplicationError(
          'system_error',
          'Services must be defined',
          'sys_srv_init'
        )
      );
    }

    return servicePaths.reduce((promise, path) => {
      return promise.then(() => {
        return new Promise((resolve, reject) => {
          logger.info('Validating service definition: ' + root + path);
          SwaggerParser.validate(root + path, (err, data) => {
            if (err) {
              logger.error(err);
              return reject(
                new ApplicationError(
                  'system_error',
                  `Service validation error for ${path}`,
                  'sys_srv_inval'
                )
              );
            } else {
              this.initService(data)
                .then(() => {
                  return resolve();
                })
                .catch(initSrvErr => {
                  return reject(initSrvErr);
                });
            }
          });
        });
      });
    }, Promise.resolve());
  }

  resolve(request) {
    return this.services.resolve(request);
  }

  release(): Promise<any> {
    return Promise.resolve();
  }

  private initService(service): Promise<any> {
    return new Promise((resolve, reject) => {
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

        const handler = this.loadHandler(
          this.system.configuration.get('handlers'),
          loadpath
        );

        if (!handler) {
          return reject(
            new ApplicationError(
              'system_error',
              `Handler for path ${loadpath} not found`,
              'sys_srv_lh'
            )
          );
        }

        this.services.add(parts, {
          method: methods,
          handler: handler,
          definitions: { security: service.securityDefinitions }
        });
      }

      return resolve();
    });
  }

  private loadHandler(sources: Array<string>, resource: string) {
    if (!sources || sources.length === 0) {
      return null;
    }

    try {
      const loadFile =
        this.system.configuration.get('system').root + sources[0] + resource;
      logger.debug('Trying to load handler: ' + resource + ' from ' + loadFile);
      const loaded = require(loadFile);
      logger.debug(`Handler ${resource} loaded from ${loadFile}`);
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
