import { ApplicationError } from '../../error';
import { Component } from '..';
import { Engine } from '../..';
import { User } from '../user';
import { Authenticator } from '../../types';
import { Account } from '../account';

let logger;

export class Auth implements Component {
  private config;

  constructor(private engine: Engine) {
    logger = engine.log.log('engine:auth');
    this.config = engine.configuration.get('auth');
  }

  async resolve(token: string) {
    // // resolve using remote AUTH provider
    // if (this.config.authenticator && this.config.authenticator.type === 'remote') {
    //   return new Promise((resolve, reject) => {
    //     const request = require('request');
    //     request.get(
    //       {
    //         url: this.config.authenticator.resolve,
    //         json: true,
    //       },
    //       (err, httpResponse, body) => {
    //         if (err) {
    //           return reject(body);
    //         }

    //         return resolve(body);
    //       }
    //     );
    //   });
    // }

    // Resolve locally
    logger.debug('Resolving token: ' + token);
    if (!token) {
      return Promise.reject(new ApplicationError('validation_error', 'token not specified', 'system_auth_resolve1'));
    }

    const split = token.split(' ');
    if (split[0].toLowerCase() !== 'bearer') {
      return Promise.reject(new ApplicationError('validation_error', 'Unsupported token type', 'system_auth_resolve2'));
    }

    logger.debug('Getting OAUTH TOKEN: ' + split[1]);
    return this.engine.token.resolve(split[1]).catch((err) => {
      if (err.error === 'not_found') {
        return Promise.reject(
          new ApplicationError('auth_error', 'Invalid autentication token', 'system_auth_resolve3')
        );
      }

      return Promise.reject(err);
    });
  }

  /**
   * Force creation of auth token outside of standard RBAC. Dangerous!
   * @param userData
   * @param permissions
   * @param ttl
   */
  async issue(userData: any, permissions: Array<string>, ttl?: number) {
    const user = userData || {};

    user._uuid = user._uuid || user.id || 'gen-' + require('uuid').v4();
    user.permissions = permissions || [];

    return this.engine.token.create(user, ttl || this.config.bearerTokenTTL);
  }

  async authenticate(params, context?: string) {
    // // Authenticate using remote AUTH provider
    // if (this.config.authenticator && this.config.authenticator.type === 'remote') {
    //   return new Promise((resolve, reject) => {
    //     const request = require('request');
    //     request.post(
    //       {
    //         url: this.config.authenticator.auth,
    //         form: params,
    //         json: true,
    //       },
    //       (err, httpResponse, body) => {
    //         if (err) {
    //           return reject(body);
    //         }

    //         return resolve(body);
    //       }
    //     );
    //   });
    // }

    // AUTH Locally
    const par = Auth.validateParams(Auth.sanitizeParams(params));
    switch (par.grant_type) {
      case 'password':
        return this.authenticateByPassword(par, context);
      case 'authorization_code':
        return this.authenticateByCode(par);
      default:
        throw new ApplicationError('validation_error', 'Invalid grant type', 'system_auth2');
    }
  }

  private async authenticateByPassword(params: any, context?: string) {
    logger.debug('Authenticating by password');
    const userAPI: User = this.engine.user;
    const accountAPI: Account = this.engine.account;

    let user;
    try {
      user = await userAPI.getUserByEmailAndPassword(params.email, params.password, context);
    } catch (err) {
      if (err.error === 'not_found') {
        throw new ApplicationError('not_found', 'User with supplied credentials not found', 'sys_ayuth_p1');
      }
      throw err;
    }
    this.engine.audit.create(user._uuid, 'auth', `User authenticated by password`);

    await userAPI.resetUserPermissionsCache(user._uuid);
    user.permissions = (await userAPI.getUserPermissions(user._uuid)) || [];
    // user.contexts = (await accountAPI.get(user.account)).contexts || [];

    return this.engine.token.create(user, this.config.bearerTokenTTL);
  }

  private async authenticateByCode(params): Promise<any> {
    logger.debug(`Authenticating by code: ${JSON.stringify(params)} with config ${JSON.stringify(this.config)}`);

    return this.engine.token.create(await this.engine.authenticate(params), this.config.bearerTokenTTL);
  }
  l;

  private static sanitizeParams(params) {
    const sanitised = {
      grant_type: params.grant_type,
      scope: params.scope,
      email: params.email,
      password: params.password,
      client_id: params.client_id,
      code: params.code,
    };
    logger.debug(JSON.stringify(sanitised, null, 2));
    return sanitised;
  }

  private static validateParams(params) {
    params = params || {};

    if (!params || Object.getOwnPropertyNames(params).length === 0) {
      throw new ApplicationError('validation_error', 'No authentication parameters supplied', 'system_auth_validate1');
    }

    if (!params.grant_type) {
      throw new ApplicationError('validation_error', 'Unspecified grant type', 'system_auth_validate2');
    }

    switch (params.grant_type) {
      case 'password':
        if (!params.email) {
          throw new ApplicationError('validation_error', 'Email must be specified', 'system_auth_validate3');
        }

        if (!params.password) {
          throw new ApplicationError('validation_error', 'password must be specified', 'system_auth_validate4');
        }
        break;
      case 'authorization_code':
        if (!params.client_id) {
          throw new ApplicationError('validation_error', 'client_id must be specified', 'system_auth_validate5');
        }

        if (!params.code) {
          throw new ApplicationError('validation_error', 'code must be specified', 'system_auth_validate6');
        }
        break;
      default:
        throw new ApplicationError(
          'validation_error',
          'Invalid grant type ' + params.grant_type,
          'system_auth_validate7'
        );
    }

    return params;
  }

  async init() {
    logger.info('Initialised');
    return Promise.resolve();
  }

  async release() {
    logger.info('Released');
    return Promise.resolve();
  }
}

export default function (engine: Engine) {
  return new Auth(engine);
}
