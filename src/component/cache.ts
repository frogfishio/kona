import { ApplicationError } from '../error';
import { Component } from './index';
import { Engine } from '../index';

let logger;

export class Cache implements Component {
  private _conf;
  private _memory;
  private _localCache = {};

  constructor(private engine: Engine) {
    logger = engine.log.log('engine:cache');
    this._conf = engine.configuration.get('cache') || {};
  }

  init(): Promise<any> {
    if (['global', 'local'].indexOf(this._conf.type) === -1) {
      throw new ApplicationError('configuration_error', `Unsupported cache type ${this._conf.type}`, 'sys_cache_init1');
    }

    if (this._conf.type === 'global') {
      this._memory = this.engine.memory;
      if (!this._memory) {
        throw new ApplicationError(
          'configuration_error',
          'Cannot use global cashe, memory not configured',
          'sys_cache_init2'
        );
      }
    }

    logger.info('Initialised');
    return Promise.resolve();
  }

  release(): Promise<any> {
    logger.info('Released');
    return Promise.resolve();
  }

  clearLocal(context: string, key?: string) {
    console.log('Clearing ' + context + ' / ' + key);
    if (!context) {
      throw new ApplicationError('invalid_request', 'Local cache context must be provided', '5759769096');
    }

    if (!key) {
      return delete this._localCache[context];
    }

    let cached = this._localCache[context];
    if (cached) {
      delete cached[key];
    }
  }

  getLocal(context: string, key?: string) {
    if (!this._localCache[context]) {
      return null;
    }

    if (!key) {
      const ctx = this._localCache[context] || {};
      return Object.getOwnPropertyNames(ctx);
    }

    let ctx = this._localCache[context];
    if (!ctx) {
      return null;
    }

    let cached = ctx[key];
    if (!cached) {
      return null;
    }

    if (cached.expires && cached.expires < Date.now()) {
      return this.clearLocal(context, key);
    }
    return cached.value;
  }

  setLocal(context: string, key: string, value: any, ttl?: number) {
    if (!context) {
      throw new ApplicationError('invalid_request', 'Local cache context must be provided', '9771677769');
    }

    if (!key) {
      throw new ApplicationError('invalid_request', 'Local cache key must be provided', '8366796655');
    }

    if (!value) {
      throw new ApplicationError('invalid_request', 'Local cache value must be provided', '2499962559');
    }

    if (!this._localCache[context]) {
      this._localCache[context] = {};
    }

    let exp = ttl || this._conf.expires;
    if (exp) {
      exp += Date.now();
    }
    this._localCache[context][key] = { value: value, expires: exp };
  }

  async getGlobal(context: string, key?: string) {
    try {
      return this._memory.get(`${context}-${key}`);
    } catch (err) {
      logger.debug(err);
      return null;
    }
  }
  async setGlobal(context: string, key: string, value: any, ttl?: number) {
    return this._memory.set(`${context}-${key}`, value, ttl);
  }
  async clearGlobal(context: string, key?: string) {
    console.log('Clearing global ' + context + ' / ' + key);
    return this._memory.remove(`${context}-${key}`);
  }

  async get(context: string, key?: string): Promise<any> {
    if (this._conf.type === 'local') {
      return this.getLocal(context, key);
    } else {
      return this.getGlobal(context, key);
    }
  }
  async set(context: string, key: string, value: any, ttl?: number): Promise<any> {
    if (this._conf.type === 'local') {
      return this.setLocal(context, key, value, ttl);
    } else {
      return this.setGlobal(context, key, value, ttl);
    }
  }
  async clear(context: string, key?: string): Promise<any> {
    if (this._conf.type === 'local') {
      return this.clearLocal(context, key);
    } else {
      return this.clearGlobal(context, key);
    }
  }
}
