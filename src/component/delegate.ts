import { ApplicationError } from '../error';
import { Component } from './index';
import { Engine } from '..';
import { DB } from './db';

export interface IDelegate {
  scope: string; // id of poject or team or other scope
  email: string; // where invitation is sent
  id: string; //_uuid of user if known
  status: string; // accepted
  roles: Array<string>; // list of delegate roles (scoped)
  code: string; // invitation code
}

let logger;

export class Delegate implements Component {
  private db: DB;

  constructor(private engine: Engine) {
    logger = engine.log.log('engine:delegate');
    this.db = engine.db;
  }

  async find(criteria, skip, limit): Promise<any> {
    criteria = criteria || {};
    return this.db.find('_delegates', {
      where: criteria,
      skip: skip,
      limit: limit,
    });
  }

  async get(delegateId: string): Promise<any> {
    return this.db.findOne('_delegates', {
      where: { _uuid: delegateId },
    });
  }

  async create(delegateData: any): Promise<any> {
    delegateData.code = require('uuid').v4();
    delegateData.status = 'pending';
    return this.db.create(
      '_delegates',
      this.engine.systemUser.account,
      await Delegate.validate(Delegate.sanitisee(delegateData))
    );
  }

  async update(delegateId, delegateData): Promise<any> {
    const delegate = await this.get(delegateId);
    // return this.db.update('_delegates', role._uuid, Role.sanitiseRole(roleData));
  }

  async remove(delegateId): Promise<any> {
    const delegate = await this.get(delegateId);
    return this.db.remove('_delegates', delegate._uuid);
  }

  private static async validate(delegate): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!delegate) {
        return reject(new ApplicationError('validation_error', 'Delegate contains no data', 'sys_del_va1'));
      }
      if (!delegate.scope) {
        return reject(new ApplicationError('validation_error', 'Missing delegate scope', 'sys_del_va2'));
      }
      if (!delegate.email) {
        return reject(new ApplicationError('validation_error', 'Missing delegate email', 'sys_del_va3'));
      }
      if (!delegate.status) {
        return reject(new ApplicationError('validation_error', 'Missing delegate status', 'sys_del_va4'));
      }
      if (!delegate.code) {
        return reject(new ApplicationError('validation_error', 'Missing delegate code', 'sys_del_va5'));
      }
      if (!delegate.roles || delegate.roles.length === 0) {
        return reject(new ApplicationError('validation_error', 'Missing delegate roles', 'sys_del_va6'));
      }

      resolve();
    });
  }

  private static sanitisee(data): IDelegate {
    const delegate: IDelegate = {
      scope: data.scope,
      email: data.email,
      id: data.id,
      status: data.status,
      roles: data.roles,
      code: data.code,
    };
    return require('../util').strip(delegate);
  }

  async init(): Promise<any> {
    logger.inf('Initialised');
  }

  async release(): Promise<any> {
    logger.info('Released');
  }
}
