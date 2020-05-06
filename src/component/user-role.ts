import { ApplicationError } from '../error';
import { Component } from './index';
import { Engine } from '..';
import { DB } from './db';

let logger;

export interface IUserRole {
  user: string;
  role: string;
  status: string; // active | disabled
  scope?: string;
  expires?: number; // timestamp of when mapping expires
  reference?: string; // e.g. subscription that added this user-role mapping
}

export class UserRole implements Component {
  private db: DB;
  private conf;

  constructor(private engine: Engine) {
    logger = engine.log.log('engine:user-role');
    this.db = engine.db;
  }

  async create(data: IUserRole): Promise<any> {
    data.status = data.status || 'enabled';
    return this.db.create('_user_roles', this.engine.systemUser.account, UserRole.sanitise(data));
  }

  async find(criteria: any, skip?: number, limit?: number): Promise<any> {
    criteria = criteria || {};
    return this.db.find('_user_roles', {
      where: criteria,
      skip: skip,
      limit: limit,
    });
  }

  async get(userRoleId: string): Promise<any> {
    return this.db.findOne('_user_roles', {
      where: { _uuid: userRoleId },
    });
  }

  async remove(userRoleId: string): Promise<any> {
    const userRole = await this.get(userRoleId);
    return this.db.remove('_user_roles', userRole._uuid);
  }

  async removeAll(userId: string, roleId: string, scope?: string) {
    if (!userId && !roleId) {
      throw new ApplicationError('invalid_request', 'Invalid criteria for removing all user roles', 'sys_ur_ra1');
    }

    const criteria: any = {};
    if (userId) {
      criteria.user = userId;
    }

    if (roleId) {
      criteria.role = roleId;
    }

    if (scope) {
      criteria.scope = scope;
    }
    return this.db.removeAll('_user_roles', criteria);
  }

  async init(): Promise<any> {
    logger.inf('Initialised');
  }

  async release(): Promise<any> {
    logger.info('Released');
  }

  private static sanitise(data) {
    return require('../util').strip({
      name: data.name,
      code: data.code,
      parent: data.parent,
      permissions: data.permissions,
      description: data.description,
      status: data.status || 'active',
      context: data.context,
    });
  }
}
