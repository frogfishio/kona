import { ApplicationError } from '../error';
import { Component } from './index';
import { Engine } from '..';

let logger;

interface UserData {
  id: string;
  type: string;
  email: string;
  account: string;
  meta: any;
  preferences: any;
  resource: string;
  permissions: Array<string>;
  tokens: any;
  contexts: Array<any>;
}

export class Token implements Component {
  private salt;

  constructor(private engine: Engine) {
    logger = engine.log.log('engine:token');
    this.salt = engine.configuration.get('system').salt;
  }

  create(userData: UserData, ttl?: number): Promise<any> {
    const timestamp = Date.now();
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha1', '' + timestamp);

    ttl = ttl || 3600;

    hmac.setEncoding('hex');
    hmac.write('' + timestamp);
    hmac.write(this.salt);
    hmac.end();

    const token: string = hmac.read().replace('=', '');
    const memstore = this.engine.memory;
    const payload = {
      timestamp: timestamp,
      data: Token.sanitiseUserData(userData)
    };

    logger.debug('Storing token payload :' + JSON.stringify(payload, null, 2));

    memstore.set('token-' + token, JSON.stringify(payload), ttl);
    return Promise.resolve({
      access_token: token,
      token_type: 'bearer',
      expires_in: ttl
    });
  }

  resolve(token: string): Promise<any> {
    return new Promise((resolve, reject) => {
      return this.engine.memory.get('token-' + token).then(resolvedData => {
        if (!resolvedData) {
          return reject(new ApplicationError('auth_error', `Token ${token} not found`, 'sys_tk_rs1'));
        }
        const payload = JSON.parse(resolvedData);
        // TODO: test for validity and reject if invalid e.g. expiration of derivative tokens
        logger.debug('Resolved token to: ' + JSON.stringify(payload, null, 2));
        return resolve(payload.data);
      });
    });
  }

  expire(token: string) {}

  init(): Promise<any> {
    logger.info('Initialised');
    return Promise.resolve();
  }

  release(): Promise<any> {
    logger.info('Released');
    return Promise.resolve();
  }

  private static sanitiseUserData(user): UserData {
    return {
      id: user._uuid,
      type: user.type,
      email: user.email,
      account: user.account,
      meta: user.meta,
      preferences: user.preferences,
      resource: user.resource,
      permissions: user.permissions,
      tokens: user.tokens,
      contexts: user.contexts
    };
  }
}
