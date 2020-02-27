import { Engine } from '..';
import { Component } from './index';
import { ApplicationError } from '../error';

const MANIFEST_EXPIRY = 31536000; // 1 year

let logger;

export class MasterData implements Component {
  private _db;
  private _stack = [];
  private _running = false;

  constructor(private engine: Engine) {
    this._db = engine.db;
    logger = engine.log.log('engine:master');
  }

  async fetch(context: string, filter?: any, skip?: number, limit?: number): Promise<Array<any>> {
    const criteria: any = {
      where: filter || {}
    };

    if (skip) {
      criteria.skip = skip;
    }

    if (limit) {
      criteria.limit = limit;
    }

    return this._db.find('_master', criteria);
  }

  store(context: string, keys: Array<string>, data: any) {
    if (!Array.isArray(data)) {
      this._stack.push({ context: context, keys: keys, data: data });
    }

    for (const item of data) {
      this._stack.push({ context: context, data: item });
    }
  }

  async init(): Promise<any> {
    this.engine.heartbeat.subscribe('master', 1, async () => {
      if (this._stack.length > 0 && !this._running) {
        this._running = true;
        logger.debug('Synchronising master data');

        while (this._stack.length > 0) {
          const elem = this._stack.shift();
          const filter = { _context: elem.context };

          if (elem.keys) {
            for (const key of elem.keys) {
              filter[key] = elem.data[key];
            }
          }

          try {
            const found = await this._db.find('_master', filter);
            if (found.length === 0) {
              elem.data._context = elem.context;
              await this._db.create('_master', this.engine.systemUser.account, elem.data);
            } else {
              for (const item of found) {
                await this._db.update('_master', item._uuid, elem.data);
              }
            }
          } catch (err) {
            console.log('ERR: -> ' + JSON.stringify(err));
          }
        }
      }
    });
    logger.info('Initialised');
    return Promise.resolve();
  }

  async release(): Promise<any> {
    logger.info('Released');
    return Promise.resolve();
  }
}
