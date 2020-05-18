import { ApplicationError } from '../error';
import { Component } from './index';
import { Engine } from '..';
import { DB } from './db';

let logger;

interface IRole {
  code: string;
  name: string;
  type?: string; // none = standard, assignable = can be delegated to another user
  status?: string; // enabled = enabled, disabled = disabled
  permissions: Array<string>;
  description?: string;
}

export class Role implements Component {
  private db: DB;
  private conf;

  constructor(private engine: Engine) {
    logger = engine.log.log('engine:role');
    this.conf = engine.configuration.get('roles');
    this.db = engine.db;
  }

  async find(criteria, skip, limit): Promise<any> {
    criteria = criteria || {};
    return this.db.find('_roles', {
      where: criteria,
      skip: skip,
      limit: limit,
      filter: ['code', 'name', 'status', 'type', 'permissions', '_uuid'],
    });
  }

  async getUserRoles(userId: string, filter?: any): Promise<any> {
    // const userRoles = await this.db.find('_user_roles', {
    //   where: { user: userId },
    // });
    const userRoles = await this.engine.userRole.find({ user: userId });

    const roles = [];
    for (const role of userRoles) {
      if (!role.scope && roles.indexOf(role.role) === -1) {
        roles.push(role.role);
      }
    }

    if (roles.length === 0) {
      return roles;
    }

    const criteria: any = filter || {};
    criteria._uuid = roles;

    return this.db.find('_roles', {
      where: criteria,
      filter: ['code', 'name', 'status', 'type', 'permissions', '_uuid'],
    });
  }

  async get(roleIdOrCode: string): Promise<any> {
    logger.debug(`Getting role ${JSON.stringify(roleIdOrCode)}`);
    let criteria: any = {
      code: roleIdOrCode,
    };

    if (roleIdOrCode.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
      criteria = {
        _uuid: roleIdOrCode,
      };
    }

    return this.db.findOne('_roles', {
      where: criteria,
      filter: ['code', '_uuid', 'name', 'status', 'type', 'permissions'],
    });
  }

  async create(role: any): Promise<any> {
    role.status = role.status || 'enabled';
    role.type = role.type || 'default';

    return Role.validateRole(role).then(() => {
      role = Role.sanitiseRole(role);
      const crit = role._uuid || role.code;

      if (crit) {
        return this.get(crit)
          .then((foundRole) => {
            if (foundRole) {
              return Promise.reject(
                new ApplicationError('already_exists', 'Role already exists', 'system_role_create')
              );
            }
          })
          .catch((err) => {
            if (err && err.error !== 'not_found') {
              return Promise.reject(err);
            }

            return this.db.create('_roles', this.engine.systemUser.account, role);
          });
      } else {
        return this.db.create('_roles', this.engine.systemUser.account, role);
      }
    });
  }

  async update(roleIdOrCode, roleData): Promise<any> {
    const role = await this.get(roleIdOrCode);
    return this.db.update('_roles', role._uuid, Role.sanitiseRole(roleData));
  }

  async remove(roleIdOrCode): Promise<any> {
    const roleId = (await this.get(roleIdOrCode))._uuid;
    await this.engine.links.removeAll(roleId);
    await this.engine.userRole.removeAll(null, roleId);
    return this.db.remove('_roles', roleId);
  }

  async listPermissions(roleId): Promise<any> {
    return this.get(roleId).then((role) => {
      return Promise.resolve(role.permissions || []);
    });
  }

  async getScopedPermissionSet(scoped: any): Promise<any> {
    let criteria = [];
    const index: any = {};
    for (const scope of Object.getOwnPropertyNames(scoped)) {
      for (const role of scoped[scope]) {
        // index scopes
        index[role] = index[role] || [];
        if (index[role].indexOf(scope) === -1) {
          index[role].push(scope);
        }

        // add to criteria
        if (criteria.indexOf(role) === -1) {
          criteria.push(role);
        }
      }
    }

    const foundRoles = await this.db.find('_roles', {
      where: { _uuid: { $in: criteria } },
      filter: ['permissions', '_uuid'],
    });

    const permissions: any = {};

    for (const role of foundRoles) {
      for (const permission of role.permissions) {
        for (const scope of index[role._uuid]) {
          permissions[scope] = permissions[scope] || [];
          if (permissions[scope].indexOf(permission) === -1) {
            permissions[scope].push(permission);
          }
        }
      }
    }

    return permissions;
  }

  async getPermissionSet(roles: Array<string>): Promise<any> {
    const permissions = [];
    if (!roles || roles.length === 0) {
      return [];
    }

    const foundRoles = await this.db.find('_roles', {
      where: { _uuid: { $in: roles } },
      filter: ['permissions', '_uuid'],
    });
    for (const role of foundRoles) {
      for (const permission of role.permissions) {
        if (permissions.indexOf(permission) === -1) {
          permissions.push(permission);
        }
      }
    }

    return permissions;
  }

  async link(roleId: string, to: string, scope?: string, meta?: any) {
    const role = await this.get(roleId);
    return this.engine.links.add('role', role._uuid, to, scope, meta);
  }

  async unlink(roleId: string, to: string) {
    const role = await this.get(roleId);
    return this.engine.links.remove('role', role._uuid, to);
  }

  async unlinkAll(roleId: string, scope?: string) {
    const role = await this.get(roleId);
    const criteria: any = {};
    if (scope) {
      criteria.scope = scope;
    }
    return this.engine.links.removeAll(role._uuid, criteria);
  }

  async links(roleId: string, filter?: any) {
    filter = filter || {};
    const role = await this.get(roleId);
    filter.from = role._uuid;
    this.engine.links.find(filter);
  }

  // -----------------------

  private static validateRole(role): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!role) {
        return reject(new ApplicationError('auth_error', 'Role contains no data', 'sys_role_va1'));
      }
      if (!role.name) {
        return reject(new ApplicationError('auth_error', 'Missing role name', 'sys_role_va2'));
      }
      // if (!role.code) {
      //   return reject(new ApplicationError('auth_error', 'Missing role code', 'sys_role_va3'));
      // }

      resolve();
    });
  }

  private static sanitiseRole(data): IRole {
    const role: IRole = {
      name: data.name,
      code: data.code,
      type: data.type,
      permissions: data.permissions,
      description: data.description,
      status: data.status,
    };
    return require('../util').strip(role);
  }

  async init(): Promise<any> {
    if (!this.conf) {
      logger.info('No roles to configure');
      return;
    }

    logger.info('Initialising roles');
    const roleCodes = Object.getOwnPropertyNames(this.conf);

    return roleCodes.reduce((promise, roleCode) => {
      return promise.then(() => {
        return this.get(roleCode)
          .then((role) => {
            logger.info(`Updating ${roleCode} role`);
            return this.update(roleCode, this.conf[roleCode]);
          })
          .catch((err) => {
            if (err.error === 'not_found') {
              logger.info(`Creating ${roleCode} role`);
              const roleData = this.conf[roleCode];
              roleData.code = roleCode;
              return this.create(roleData);
            }

            return Promise.reject(err);
          });
      });
    }, Promise.resolve());
  }

  async release(): Promise<any> {
    return Promise.resolve();
  }
}
