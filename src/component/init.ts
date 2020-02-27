import { ApplicationError } from '../error';
import { Component } from './index';
import { Engine } from '..';

let logger;
// const debug = require('debug')('engine:init');

export class Init implements Component {
  private conf;
  private prefix;

  constructor(private engine: Engine) {
    logger = engine.log.log('engine:init');
    this.conf = engine.configuration.get('init');
    this.prefix = engine.configuration.get('system').root;
  }

  init(): Promise<any> {
    logger.info('Processing initialisers');
    return this.prepareLoadList()
      .then(list => {
        return list.reduce((promise, initialiser) => {
          return promise.then(() => {
            return this.loadInitialiser(initialiser).then(loader => {
              return loader.init();
            });
          });
        }, Promise.resolve());
      })
      .then(() => {
        logger.info('Initialised');
        return Promise.resolve();
      });
  }

  release(): Promise<any> {
    return Promise.resolve();
  }

  private loadInitialiser(initialiser): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        logger.debug(`Trying to load initialiser: ${initialiser}`);
        const loaded = require(initialiser);
        return resolve(new loaded.default(this.engine));
      } catch (ex) {
        if (ex.code === 'MODULE_NOT_FOUND') {
          return reject(new ApplicationError('system_error', `Initialiser ${initialiser} not found`, 'sys_init_lonf'));
        }

        logger.error(ex);
        return reject(
          new ApplicationError('system_error', `Unknown error loading initialiser ${initialiser}`, 'sys_init_lonfx')
        );
      }
    });
  }

  private prepareLoadList(): Promise<any> {
    let loaders = [];

    return this.conf
      .reduce((promise, path) => {
        return promise.then(() => {
          return this.getLoaders(path).then(items => {
            for(const item of items) {
              if(item.indexOf('.js') === item.length -3) {
                loaders.push(item);
              }
            }
            return Promise.resolve(loaders);
          });
        });
      }, Promise.resolve())
      .then(() => {
        return Promise.resolve(loaders);
      });
  }

  private getLoaders(source) {
    const absoluteFiles = [];
    return new Promise((resolve: (result: Array<string>) => void, reject) => {
      const fs = require('fs');

      fs.readdir(this.prefix + source, (err, files: Array<string>) => {
        if (err) {
          return reject(new ApplicationError('system_error', `Error reading init source folder ${this.prefix + source}`, 'sys_init_gl1'));
        }

        for(const file of files) {
          absoluteFiles.push(this.prefix + source + '/' + file);
        }

        return resolve(absoluteFiles);
      });
    });
  }
}
