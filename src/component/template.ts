import { ApplicationError } from '../error';
import { Component } from './index';
import { Engine } from '../index';

let logger;
// const debug = require('debug')('engine:template');

export class Template implements Component {
  private prefix;
  private conf;
  private cached = {};

  constructor(private engine: Engine) {
    logger = engine.log.log('engine:template');
    this.prefix = engine.configuration.get('system').root;
    this.conf = engine.configuration.get('templates') || {};
  }

  init(): Promise<any> {
    return this.conf.reduce((promise, path) => {
      return promise.then(() => {
        return this.loadTemplates(path).then(items => {
          for (const item of items) {
            this.cached[item.name] = item.template;
          }
          return Promise.resolve();
        });
      });
    }, Promise.resolve());

    logger.info('Initialised');
    return Promise.resolve();
  }

  release(): Promise<any> {
    logger.info('Released');
    return Promise.resolve();
  }

  render(name: string, data?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.cached[name]) {
        return reject(new ApplicationError('not_found', `Tempalte ${name} not found`, 'sys_en_ter1'));
      }

      return resolve(this.cached[name](data));
    });
  }

  private loadTemplates(source): Promise<any> {
    const fs = require('fs');
    const Handlebars = require('handlebars');

    Handlebars.registerHelper('iff', (v1, operator, v2, options) => {
      switch (operator) {
        case '==':
          return v1 == v2 ? options.fn(this) : options.inverse(this);
        case '===':
          return v1 === v2 ? options.fn(this) : options.inverse(this);
        case '!=':
          return v1 != v2 ? options.fn(this) : options.inverse(this);
        case '!==':
          return v1 !== v2 ? options.fn(this) : options.inverse(this);
        case '<':
          return v1 < v2 ? options.fn(this) : options.inverse(this);
        case '<=':
          return v1 <= v2 ? options.fn(this) : options.inverse(this);
        case '>':
          return v1 > v2 ? options.fn(this) : options.inverse(this);
        case '>=':
          return v1 >= v2 ? options.fn(this) : options.inverse(this);
        case '&&':
          return v1 && v2 ? options.fn(this) : options.inverse(this);
        case '||':
          return v1 || v2 ? options.fn(this) : options.inverse(this);
        default:
          return options.inverse(this);
      }
    });

    logger.debug(`Loading templates from ${source}`);

    return new Promise((resolve: (param?: Array<any>) => void, reject) => {
      fs.readdir(this.prefix + source, (err, files) => {
        if (err) {
          return reject(new ApplicationError('system_error', `Error reading templates folder`, 'sys_en_te1'));
        }

        logger.debug(`Template files ${JSON.stringify(files)}`);
        return resolve(files);
      });
    }).then(files => {
      const result = [];
      return files.reduce((promise, file) => {
        return promise.then(() => {
          return new Promise((resolve, reject) => {
            fs.readFile(this.prefix + source + '/' + file, 'utf8', (err, data) => {
              if (err) {
                return reject(new ApplicationError('system_error', `Error reading template ${file}`, 'sys_en_te2'));
              }

              result.push({ name: file, template: Handlebars.compile(data) });
              logger.debug(`Template ${this.prefix + source + '/' + file} loaded`);
              return resolve(result);
            });
          });
        });
      }, Promise.resolve());
    });
  }
}
