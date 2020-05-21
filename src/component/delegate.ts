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

  async find(criteria: any, skip?: number, limit?: number): Promise<any> {
    criteria = criteria || {};
    return this.db.find('_delegates', {
      where: criteria,
      skip: skip,
      limit: limit,
    });
  }

  async get(delegateId: string): Promise<any> {
    try {
      return this.db.findOne('_delegates', {
        where: { _uuid: delegateId },
      });
    } catch (err) {
      if (err.error === 'not_found') {
        throw new ApplicationError('not_found', `Delegate ${delegateId} not found`, 'sys_del_get1');
      }

      throw err;
    }
  }

  async create(delegateData: any): Promise<any> {
    //TODO: check whether role is transferrable and throw exception if not, check whther user actually owns that role
    delegateData.code = require('uuid').v4();
    delegateData.status = 'pending';
    return this.db.create(
      '_delegates',
      this.engine.systemUser.account,
      await Delegate.validate(Delegate.sanitisee(delegateData))
    );
  }

  /**
   * If roles have changed it adds/removes the roles as necesary
   * @param delegateId
   * @param delegateData
   */
  async update(delegateId, delegateData): Promise<any> {
    const delegate = await this.get(delegateId);
    delegateData = Delegate.sanitisee(delegateData);

    if (delegate.status === 'active' && delegateData.roles) {
      const remove: Array<string> = [];
      const add: Array<string> = [];
      for (const role of delegateData.roles) {
        if (delegate.roles.indexOf(role) === -1) {
          add.push(role);
        }
      }

      for (const role of delegate.roles) {
        if (delegateData.roles.indexOf(role) === -1) {
          remove.push(role);
        }
      }

      if (remove.length > 0) {
        await this.removeDelegateRoles(delegate.id, remove, delegate.scope);
      }
      if (add.length > 0) {
        await this.addDelegateRoles(delegate.id, add, delegate.scope);
      }
    }

    return this.db.update('_delegates', delegate._uuid, delegateData);
  }

  private async addDelegateRoles(userId: string, roles: Array<string>, scope: string) {
    return roles.reduce((promise, roleCode) => {
      return promise.then(() => {
        return this.engine.user.addRoleToUser(userId, roleCode, scope);
      });
    }, Promise.resolve());
  }

  private async removeDelegateRoles(userId: string, roles: Array<string>, scope?: string) {
    return roles.reduce((promise, roleCode) => {
      return promise.then(() => {
        return this.engine.user.removeRoleFromUser(userId, roleCode, scope);
      });
    }, Promise.resolve());
  }

  /**
   * It also removes the related roles
   * @param delegateId
   */
  async remove(delegateId): Promise<any> {
    const delegate = await this.get(delegateId);
    if (delegate.status === 'active' && delegate.roles.length > 0) {
      await this.removeDelegateRoles(delegate.id, delegate.roles, delegate.scope);
    }
    return this.db.remove('_delegates', delegate._uuid);
  }

  /**
   * Activates the delegate using the code. After it's activated, the code is removed and
   * status is changed. Once spent, delegate can't be reactivated
   * @param code
   */
  async activate(userId: string, code: string) {
    if (!code) {
      throw new ApplicationError('invalid_request', 'Activation code not specified', 'sys_del_act0');
    }

    const result = await this.find({ code: code });
    if (result.length === 0) {
      throw new ApplicationError('not_found', 'Delegate code not found', 'sys_del_act1');
    }

    const user = await this.engine.user.get(userId);
    // const res = await result[0].roles.reduce((promise, roleCode) => {
    //   return promise.then(() => {
    //     return this.engine.user.addRoleToUser(userId, roleCode, result[0].scope);
    //   });
    // }, Promise.resolve());

    const res = await this.addDelegateRoles(user._uuid, result[0].roles, result[0].scope);

    logger.debug(`Activation result: ${JSON.stringify(res)}`);
    return this.update(result[0]._uuid, { id: userId, status: 'active', code: false });
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

      resolve(delegate);
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
    logger.info('Initialised');
  }

  async release(): Promise<any> {
    logger.info('Released');
  }
}
