import { ApplicationError } from '../error';
import { Component } from './index';
import { Engine } from '..';
import { DB } from './db';
import { Audit } from './audit';

let logger;

export class User implements Component {
  private _conf;
  private db: DB;
  private audit: Audit;

  constructor(private engine: Engine) {
    logger = engine.log.log('engine:user');
    this._conf = this.engine.configuration.get('user') || {};
    this.audit = this.engine.audit;
    this.db = engine.db;
  }

  async count(criteria: any) {
    return this.db.count('_users', criteria);
  }

  async find(criteria?: any, skip?: number, limit?: number) {
    criteria = criteria || {};

    return this.db.find('_users', {
      where: criteria,
      skip: skip,
      limit: limit,
      filter: ['email', '_uuid', 'meta', 'account', '_created', 'status', 'verified', 'context'],
    });
  }

  async get(userId: string) {
    return this.db.findOne('_users', {
      where: { _uuid: userId },
      filter: ['_uuid', 'email', 'meta', 'account', 'status', 'expire', 'verified', 'preferences'],
    });
  }

  async create(userData, accountIdOrData?, options?: any) {
    userData = this.sanitizeUser(userData);
    if (userData.password) {
      userData.password = User.hash(userData.password);
      userData.status = 'active';
    } else {
      userData.status = 'locked';
    }

    // const shortid = require('shortid');
    userData.verify = require('uuid').v4(); // shortid.generate(); // crypto.randomBytes(16).toString('hex');

    this.validateUser(userData, options);
    try {
      const foundUser = await this.getUserByEmail(userData.email, userData.context);
      if (options && options.ignoreDuplicateUser) {
        return { id: foundUser._uuid };
      }
      throw new ApplicationError('validation_error', 'User with that email already exists', '7124008742');
    } catch (err) {
      if (err && err.error !== 'not_found') {
        throw err;
      }

      const account = await this.findOrCreateAccount(accountIdOrData);
      userData.account = account.id;
      logger.debug('Creating user: ' + JSON.stringify(userData));

      const result = await this.db.create('_users', this.engine.systemUser.account, userData);
      this.audit.create(result.id, 'user', 'User created');

      if (userData.status === 'locked') {
        this.engine.events.signal('locked_user_created', { user: result.id });
      } else {
        this.engine.events.signal('user_created', { user: result.id });
      }

      logger.debug(`Adding role to user ${result.id}`);
      const rres = await this.addRoleToUser(result.id, this._conf.defaultRole);
      this.audit.create(result.id, 'user', `Added ${this._conf.defaultRole} to user ${result.id}`);
      return rres;
    }
  }

  async update(userId, data) {
    const user = await this.get(userId);
    data = require('../util/strip')({ status: data.status });
    if (Object.getOwnPropertyNames(data).length === 0) {
      throw new ApplicationError('validation_error', 'No data to update', 'system_user_update');
    }

    return this.db.update('_users', userId, data);
  }

  private async findOrCreateAccount(accountIdOrData: string | any) {
    let criteria: any = null;
    const accountAPI = this.engine.account;

    if (!accountIdOrData) {
      return accountAPI.create({});
    }

    if (typeof accountIdOrData === 'string' || accountIdOrData instanceof String) {
      if (accountIdOrData.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
        criteria = accountIdOrData;
      }
    }

    if (criteria) {
      return accountAPI.get(criteria);
    } else {
      return accountAPI.create(accountIdOrData || {});
    }
  }

  async updatePassword(userId: string, oldPasswordOrResetCode: string, newPassword: string) {
    const user = await this.db.findOne('_users', {
      where: { _uuid: userId },
      filter: ['_uuid', 'email', 'meta', 'account', 'status', 'expire', 'verified', 'preferences'],
    });

    const reset = User.validateUpdatePassword(user, oldPasswordOrResetCode, newPassword);
    const value: any = {
      password: User.hash(newPassword),
      reset: user.reset,
    };

    if (reset === true) {
      value.reset.expired = true;
    }

    await this.db.update('_users', user._uuid, value);
    this.engine.events.signal('user_password_changed', { user: user._uuid });
    return { id: user._uuid };
  }

  async updatePasswordByResetCode(userIdOrResetCode: string, newPassword: string) {
    if (!newPassword) {
      throw new ApplicationError('validation_error', 'New password must be specified', 'system_user_validate_uprc1');
    }

    const user = await this.db.findOne('_users', {
      where: { 'reset.code': userIdOrResetCode },
      filter: ['_uuid', 'email', 'meta', 'account', 'status', 'expire', 'verified', 'preferences'],
    });

    const value: any = {
      password: User.hash(newPassword),
      reset: user.reset,
    };

    value.reset.expired = true;

    await this.db.update('_users', user._uuid, value);
    this.engine.events.signal('user_password_changed', { user: user._uuid });
    return { id: user._uuid };
  }

  async updateEmail(userId: string, newEmail: string, password: string) {
    if (!userId) {
      return Promise.reject(
        new ApplicationError('validation_error', 'User ID must be specified', 'system_user_update_email_1')
      );
    }

    if (!password) {
      return Promise.reject(
        new ApplicationError('validation_error', 'Password must be specified', 'system_user_update_email_2')
      );
    }

    if (!newEmail) {
      return Promise.reject(
        new ApplicationError('validation_error', 'New email must be specified', 'system_user_update_email_3')
      );
    }

    newEmail = newEmail.toLowerCase();
    const regEmail = /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
    if (!regEmail.test(newEmail)) {
      return Promise.reject(
        new ApplicationError('validation_error', 'Invalid email format', 'system_user_update_email_4')
      );
    }

    return this.getUserByEmail(newEmail)
      .then((foundUser) => {
        if (foundUser) {
          return Promise.reject(
            new ApplicationError(
              'validation_error',
              'User with that email already exists',
              'system_user_update_email_5'
            )
          );
        }
      })
      .catch(() => {
        return this.db.get('_users', userId).then((user) => {
          if (User.hash(password, user.password.salt).hash !== user.password.hash) {
            return Promise.reject(
              new ApplicationError('validation_error', 'Invalid password', 'system_user_update_email_6')
            );
          }

          const crypto = require('crypto');

          return this.db
            .update('_users', userId, {
              email: newEmail,
              emailChanged: Date.now(),
              verified: false,
              verify: crypto.randomBytes(16).toString('hex'),
            })
            .then(() => {
              this.engine.events.signal('user_email_changed', { user: user._uuid });
              return Promise.resolve({ id: userId });
            });
        });
      });
  }

  async verify(code) {
    if (!code) {
      throw new ApplicationError('validation_error', 'Verify code not specified', 'system_user_verify1');
    }

    const user = await this.db.findOne('_users', { verify: code }, 'User');
    logger.debug(`Verifying user ${JSON.stringify(user)} with code ${code}`);
    return this.db.update('_users', user._uuid, { verified: true, verify: null });
  }

  async updateMeta(userId: string, meta: any, override?: any) {
    return this.db.get('_users', userId).then((user) => {
      const _meta = override || user.meta || {};
      const names = Object.getOwnPropertyNames(meta);
      const userConf = this.engine.configuration.get('user') || {
        meta: {},
      };

      for (const name of names) {
        if (userConf.meta[name]) {
          if (userConf.meta[name].options) {
            if (userConf.meta[name].options.indexOf(meta[name]) === -1) {
              return Promise.reject(
                new ApplicationError(
                  'validation_error',
                  'Invalid value for parameter "' + name + '"',
                  'system_user_update_meta'
                )
              );
            } else {
              _meta[name] = meta[name];
            }
          } else {
            _meta[name] = meta[name];
          }
        }
      }

      logger.debug(`Updating meta: ${JSON.stringify(_meta)}`);

      return this.validateMeta(_meta).then(() => {
        return this.db
          .update('_users', userId, {
            meta: _meta,
          })
          .then(() => {
            this.engine.events.signal('user_changed', { user: user._uuid });
            return Promise.resolve({ id: userId });
          });
      });
    });
  }

  async replaceMeta(userId: string, meta: any) {
    return this.updateMeta(userId, meta, {});
  }

  async updatePreferences(userId: string, preferences: any, override?: any) {
    return this.db.get('_users', userId).then((user) => {
      const _preferences = override || user.preferences || override || {};

      for (const name of Object.getOwnPropertyNames(preferences)) {
        _preferences[name] = preferences[name];
      }
      logger.debug(`Updating preferences: ${JSON.stringify(_preferences)}`);

      return this.db
        .update('_users', userId, {
          preferences: _preferences,
        })
        .then((res) => {
          this.engine.events.signal('user_preferences_changed', { user: user._uuid });
          return Promise.resolve(res);
        });
    });
  }

  async replacePreferences(userId: string, preferences: any) {
    return this.updatePreferences(userId, preferences, {});
  }

  remove(userId: string): Promise<any> {
    return this.db.remove('_users', userId);
  }

  /**
   * Starts password request process for email
   * @param email
   */
  requestPasswordReset(email: string): Promise<any> {
    return this.getUserByEmail(email).then((user) => {
      return new Promise((resolve, reject) => {
        require('crypto').randomBytes(32, (err, buf) => {
          if (err) {
            return err;
          }

          // TODO: fix, this is not guaranteed secure & unique
          return resolve(buf.toString('hex'));
        });
      }).then((token) => {
        return this.db
          .update('_users', user._uuid, {
            reset: {
              code: token,
              expires: Date.now() + 3600000 * 24,
            },
          })
          .then(() => {
            this.engine.events.signal('user_password_reset_generated', { user: user._uuid, token: token });
            return Promise.resolve({ processed: true });
          });
      });
    });
  }

  async getUserRoles(userId: string): Promise<any> {
    const roles: Array<string> = [];
    const scopes: any = {};
    const rolemap = await this.engine.userRole.find({ user: userId });

    for (const map of rolemap) {
      if (!map.status || map.status === 'active' || map.status === 'enabled') {
        //TODO: fix after migrating data
        if (map.scope) {
          scopes[map.scope] = scopes[map.scope] || [];
          if (scopes[map.scope].indexOf(map.role) === -1) {
            scopes[map.scope].push(map.role);
          }
        } else {
          if (roles.indexOf(map.role) === -1) {
            roles.push(map.role);
          }
        }
      }
    }

    if (Object.getOwnPropertyNames(scopes).length > 0) {
      return { global: roles, scoped: scopes };
    }
    return roles;
  }

  async getUserIdByEmail(email: string, context?: string) {
    return this.getUserByEmail(email, context).then((user) => {
      return Promise.resolve({ id: user._uuid });
    });
  }

  async getUserByEmail(email: string, context?: string) {
    logger.debug(`Looking for user ${email} in context ${context}`);
    return this.db.findOne('_users', { email: email.trim().toLowerCase(), context: context }, 'User');
  }

  async getUserByEmailAndPassword(email: string, password: string, context?: string) {
    const user = await this.getUserByEmail(email, context);
    const pass = User.hash(password, user.password.salt);

    if (pass.hash !== user.password.hash) {
      throw new ApplicationError('validation_error', 'Invalid email / password combination', 'system_user_getep');
    }

    return user;
  }

  async getUserByAccount(accountId: string, context?: string) {
    return this.db.findOne('_users', { account: accountId, context: context }, 'User');
  }

  async resetUserPermissionsCache(userId: string) {
    this.engine.cache.clear('_user_permissions', userId);
  }

  async getUserPermissions(userId): Promise<any> {
    logger.debug('Getting user permissions');
    const cachedPermissions = await this.engine.cache.get('_user_permissions', userId);
    if (cachedPermissions) {
      logger.debug(`Returning cached permissions: ${JSON.stringify(cachedPermissions)}`);
      return cachedPermissions;
    }

    logger.debug('Getting user roles');
    const roles = await this.getUserRoles(userId);
    logger.debug(`Got roles ${JSON.stringify(roles)}`);

    let permissions: any;
    if (Array.isArray(roles)) {
      permissions = await this.engine.role.getPermissionSet(roles);
    } else {
      const map: any = roles.scoped;
      map.global = roles.global;
      permissions = await this.engine.role.getScopedPermissionSet(map);
    }

    this.engine.cache.set('_user_permissions', userId, permissions);
    logger.debug(`Roleset: ${JSON.stringify(roles)} resolves to permissions ${JSON.stringify(permissions)}`);
    return permissions;
  }

  async addRoleToUser(userId: string, roleIdOrCode: string, scope?: string): Promise<any> {
    // shield against hacking the role code
    if (('' + roleIdOrCode).trim().toLowerCase() === 'global') {
      throw new ApplicationError('validation_error', 'Invalid role global', 'sys_user_artu1');
    }

    logger.debug(`Adding role ${roleIdOrCode} to user ${userId}`);
    const user = await this.get(userId);
    const role = await this.engine.role.get(roleIdOrCode);

    const criteria: any = {
      user: user._uuid,
      role: role._uuid,
    };

    if (scope) {
      criteria.scope = scope;
    }

    if ((await this.engine.userRole.find(criteria)).length > 0) {
      return { id: user._uuid };
    }

    const data: any = {
      user: user._uuid,
      role: role._uuid,
    };

    if (scope) {
      data.scope = scope;
    }

    data.status = 'enabled';
    await this.engine.userRole.create(data);

    this.resetUserPermissionsCache(userId);
    logger.debug(`Role ${role.name} (Scope: ${scope ? scope : 'global'}) added to user ${user._uuid}`);
    return { id: user._uuid };
  }

  async removeRoleFromUser(userId: string, roleIdOrCode: string, scope?: string): Promise<any> {
    const role = await this.engine.role.get(roleIdOrCode);
    await this.engine.userRole.removeAll(userId, role._uuid, scope);
    await this.engine.role.unlink(role._uuid, userId);
    this.engine.cache.clear('_user_permissions', userId);
    return { id: userId };
  }

  private sanitizeUser(user, skipMeta?: boolean) {
    const ret: any = {
      email: user.email ? user.email.trim().toLowerCase() : null,
      password: user.password,
      status: user.status,
      context: user.context,
      verify: user.verify,
      expire: user.expire,
      reset: user.reset,
      resetExpire: user.resetExpire,
    };

    if (skipMeta) {
      logger.debug('Skipping meta data');
    }

    if (!skipMeta && user.meta) {
      logger.debug(`Applying user meta data`);
      const userConf = this.engine.configuration.get('user');
      if (userConf.meta) {
        ret.meta = {};

        for (const name of Object.getOwnPropertyNames(userConf.meta)) {
          if (user.meta[name]) {
            ret.meta[name] = user.meta[name];
          }
        }
      }
    }

    return require('../util/strip')(ret);
  }

  private static validateUpdatePassword(user, passwordOrResetCode, newPassword) {
    if (!user) {
      throw new ApplicationError('validation_error', 'User must be specified', 'system_user_validate_up1');
    }

    if (!passwordOrResetCode) {
      throw new ApplicationError(
        'validation_error',
        'Password or reset code must be specified',
        'system_user_validate_up2'
      );
    }

    if (!newPassword) {
      throw new ApplicationError('validation_error', 'New password must be specified', 'system_user_validate_up3');
    }

    if (passwordOrResetCode === newPassword) {
      throw new ApplicationError(
        'validation_error',
        'Old and new passwords must be different',
        'system_user_validate_up4'
      );
    }

    if (User.hash(passwordOrResetCode, user.password.salt).hash !== user.password.hash) {
      if (user.reset && passwordOrResetCode === user.reset.code) {
        if (user.reset.expired || user.reset.expires < Date.now()) {
          throw new ApplicationError('validation_error', 'Expired reset code', 'system_user_validate_up5');
        }

        return true;
      }
      throw new ApplicationError('validation_error', 'Invalid password or reset code', 'system_user_validate_up6');
    }
  }

  private async validateMeta(meta) {
    return new Promise((resolve, reject) => {
      logger.debug(`Validating meta: ${JSON.stringify(meta)} against spec: ${JSON.stringify(this._conf.meta)}`);

      const names = Object.getOwnPropertyNames(this._conf.meta);

      for (let i = 0; i < names.length; i++) {
        if (this._conf.meta[names[i]].mandatory === true) {
          if (!meta[names[i]]) {
            return reject(
              new ApplicationError('validation_error', this._conf.meta[names[i]].message, 'system_user_validate_meta1')
            );
          }
        }

        if (meta[names[i]]) {
          if (this._conf.meta[names[i]].options) {
            if (this._conf.meta[names[i]].options.indexOf(meta[names[i]]) === -1) {
              return reject(
                new ApplicationError(
                  'validation_error',
                  'Invalid value for ' + names[i] + ' is ' + meta[names[i]],
                  'system_user_validate_meta2'
                )
              );
            }
          }
        }
      }

      return resolve(null);
    });
  }

  private validateUser(data: any, options?: any) {
    options = options || {};
    if (!data) {
      throw new ApplicationError('validation_error', 'User contains no data', 'system_user_validate_user1');
    }

    if (!data.email) {
      throw new ApplicationError('validation_error', 'Missing email', 'system_user_validate_user2');
    }

    const regEmail = /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
    if (!regEmail.test(data.email)) {
      throw new ApplicationError('validation_error', 'Invalid email format', 'system_user_validate_user3');
    }

    if (data.password) {
      if (this._conf.passwordLength && data.password.length < this._conf.passwordLength) {
        throw new ApplicationError(
          'validation_error',
          'Password must be at least ' + this._conf.passwordLength + ' characters long',
          'system_user_validate_user4'
        );
      }
    }

    if (data.meta && this._conf.meta) {
      const meta = data.meta;

      for (const name of Object.getOwnPropertyNames(this._conf.meta)) {
        if (this._conf.meta[name].mandatory === true) {
          logger.debug(`Trying to get mandatory meta element ${name}`);
          if (!meta[name]) {
            throw new ApplicationError('validation_error', this._conf.meta[name].message, 'system_user_validate_user5');
          }
        }

        if (meta[name]) {
          if (this._conf.meta[name].options) {
            if (this._conf.meta[name].options.indexOf(meta[name]) === -1) {
              throw new ApplicationError(
                'validation_error',
                'Invalid value for ' + name + ' is ' + meta[name],
                'system_user_validate_user6'
              );
            }
          }
        }
      }
    }
  }

  async init(): Promise<any> {
    if (!this._conf.users) {
      return;
    }

    logger.info('Initialising base users');
    const users = this._conf.users;

    return users.reduce((promise, user) => {
      return promise.then(() => {
        logger.info(`Verifying user ${user.email}`);
        return this.getUserByEmail(user.email).catch((err) => {
          if (err.error === 'not_found') {
            const userData = {
              email: user.email,
              password: user.password,
              meta: user.meta,
            };
            return this.create(userData).then((result) => {
              return user.roles.reduce((ppromise, role) => {
                return ppromise.then(() => {
                  logger.info(`Adding role ${role} to user ${user.email}`);
                  return this.addRoleToUser(result.id, role);
                });
              }, Promise.resolve());
            });
          }

          return Promise.reject(err);
        });
      });
    }, Promise.resolve());
  }

  private static hash(password, salt?) {
    const crypto = require('crypto');
    salt = salt || crypto.randomBytes(16).toString('hex');
    let hash = crypto.createHmac('sha512', salt);

    hash.update(password);
    hash = hash.digest('hex');

    return {
      salt: salt,
      hash: hash,
    };
  }

  release(): Promise<any> {
    return Promise.resolve();
  }
}
