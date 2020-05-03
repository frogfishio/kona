import { ApplicationError } from '../error';
import { Component } from './index';
import { Engine } from '..';
import { DB } from './db';

let logger;

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

    return this.db.findOne('_roles', { where: criteria, filter: ['code', '_uuid', 'name', 'context', 'permissions'] });
  }

  async create(role: any): Promise<any> {
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

  async update(roleIdOrCode, role): Promise<any> {
    if (roleIdOrCode.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
      return this.db.update('_roles', roleIdOrCode, role);
    } else {
      return this.get(roleIdOrCode).then((foundRole) => {
        return this.db.update('_roles', foundRole._uuid, role);
      });
    }
  }

  async remove(roleIdOrCode): Promise<any> {
    let roleId = roleIdOrCode;

    if (!roleIdOrCode.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
      const foundRole = await this.get(roleIdOrCode);
      roleId = foundRole._uuid;
    }

    await this.db.removeAll('_user_roles', { role: roleId });
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

  private static validateRole(role): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!role) {
        return reject(new ApplicationError('auth_error', 'Role contains no data', '5067072462'));
      }
      if (!role.name) {
        return reject(new ApplicationError('auth_error', 'Missing role name', '5308024757'));
      }
      // if (!role.code) {
      //   return reject(new ApplicationError('auth_error', 'Missing role code', 'sys_role_va3'));
      // }

      resolve();
    });
  }

  private static sanitiseRole(data) {
    return require('../util/strip')({
      name: data.name,
      code: data.code,
      parent: data.parent,
      permissions: data.permissions,
      description: data.description,
      status: data.status || 'active',
      context: data.context,
    });
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
