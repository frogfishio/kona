import { ApplicationError } from '../error';
import { Component } from './index';
import { Engine } from '..';
import { DB } from './db';

let logger;

interface ILimit {
  reference: string;
  expires: number; // timestamp
  limit: any; // { <scope>: value | [value...]}
}

export class Limits implements Component {
  private db: DB;
  private conf;

  constructor(private engine: Engine) {
    logger = engine.log.log('engine:limits');
  }

  async find(criteria, skip, limit): Promise<any> {
    criteria = criteria || {};
    return this.db.find('_limits', {
      where: criteria,
      skip: skip,
      limit: limit,
      filter: ['_uuid', 'reference', 'expires', 'limit'],
    });
  }

  async get(limitId: string): Promise<any> {
    return this.db.findOne('_limits', {
      where: { _uuid: limitId },
      filter: ['_uuid', 'reference', 'expires', 'limit'],
    });
  }

  async create(data: any): Promise<any> {
    const limit: ILimit = {
      reference: data.reference,
      expires: data.expires,
      limit: data.limit,
    };
    return this.db.create('_limits', this.engine.systemUser.account, require('../util').strip(limit));
  }

  async remove(limitId: string): Promise<any> {
    const limit = await this.get(limitId);
    return this.db.remove('_limits', limit._uuid);
  }

  async init(): Promise<any> {
    logger.info('Initialised');
  }

  async release(): Promise<any> {
    logger.info('Released');
  }
}
