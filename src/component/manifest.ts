import { Engine } from '..';
import { Component } from './index';
import { ApplicationError } from '../error';

const MANIFEST_EXPIRY = 31536000; // 1 year

let logger;

export class Manifest implements Component {
  private memory;
  private systemId;

  constructor(private engine: Engine) {
    this.memory = engine.memory;
    this.systemId = engine.configuration.get('system').id;
    logger = engine.log.log('engine:manifest');
  }

  async get(): Promise<any> {
    return this.memory.get(`${this.systemId}_manifest`);
  }

  async set(context: string, data: any): Promise<any> {
    data = require('../util/strip')(data);
    if (!data) {
      throw new ApplicationError(
        'validation_error',
        'Attempting to set manifest to null value',
        'sys_manifest_set'
      );
    }
    return this.get().then(manifest => {
      manifest = manifest || {};
      if (!manifest[context]) {
        manifest[context] = data;
      } else {
        for (const name of Object.getOwnPropertyNames(data)) {
          manifest[context][name] = data[name];
        }
      }

      this.memory.set(`${this.systemId}_manifest`, manifest, MANIFEST_EXPIRY);
      return Promise.resolve();
    });
  }

  async init(): Promise<any> {
    logger.info('Initialised');
    return Promise.resolve();
  }

  async release(): Promise<any> {
    logger.info('Released');
    return Promise.resolve();
  }
}
