import { ApplicationError } from '../error';
import { Component } from './index';
import { Engine } from '..';
import { DB } from './db';

let logger;

export class Account implements Component {
  private db: DB;

  constructor(private engine: Engine) {
    logger = engine.log.log('engine:account');
    this.db = engine.db;
  }

  async init(): Promise<any> {
    logger.info('Initialised');
    return Promise.resolve();
  }

  async find(criteria: any, skip: number, limit: number) {
    criteria = criteria || {};
    return this.db.find('_accounts', {
      where: criteria,
      skip: skip,
      limit: limit,
      filter: ['_uuid', 'name', 'status', '_created', 'type', 'category']
    });
  }

  async get(accountId: string) {
    return this.db.get('_accounts', accountId);
  }

  async create(account) {
    logger.debug(`Creating: ${JSON.stringify(account)}`);
    return this.db.create(
      '_accounts',
      this.engine.systemUser.account,
      require('../util/strip')({
        name: account.name,
        status: account.status || 'active',
        type: account.type,
        category: account.category
      })
    );
  }

  async update(accountId: string, data: any) {
    return this.get(accountId).then(() => {
      return this.db.update(
        '_accounts',
        accountId,
        require('../util/strip')({
          name: data.name,
          status: data.status || 'active',
          type: data.type,
          category: data.category
        })
      );
    });
  }

  async remove(accountId: string) {
    return this.get(accountId).then(() => {
      return this.db.remove('_accounts', accountId);
    });
  }

  async meta(accountId: string, metaData: any) {
    return this.get(accountId).then(() => {
      return this.db.update('_accounts', accountId, metaData);
    });
  }

  async createContext(accountId: string, data: any) {
    const uuid = require('uuid').v4();
    return this.get(accountId)
      .then(account => {
        const contexts = account.contexts || [];
        contexts.push({ id: uuid, reference: data.reference });
        return this.db.update('_accounts', accountId, { contexts: contexts });
      })
      .then(() => {
        return Promise.resolve({ id: uuid });
      });
  }

  async removeContext(accountId: string, contextId: string) {
    return this.get(accountId).then(account => {
      const contexts = account.contexts || [];

      for (let idx = 0; idx < contexts.length; idx++) {
        if (contexts[idx].id === contextId) {
          contexts.splice(idx, 1);
          return this.db.update('_accounts', accountId, { contexts: contexts }).then(() => {
            return Promise.resolve({ id: contextId });
          });
        }
      }

      throw new ApplicationError('not_found', `Context not found`, 'system_account_context_remove');
    });
  }

  async release(): Promise<any> {
    logger.info('Released');
    return Promise.resolve();
  }
}

export default function(engine: Engine) {
  return new Account(engine);
}
