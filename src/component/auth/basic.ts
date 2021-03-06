import { ApplicationError } from '../../error';
import { Engine } from '../..';

let logger;

export class BasicAuth {
  constructor(private enigne: Engine) {
    logger = enigne.log.log('engine:auth:basic');
  }

  authenticate(req, permissions): Promise<any> {
    logger.debug(`Authenticating user against ${JSON.stringify(permissions)}`);
    return this.enigne.auth.resolve(req.header('authorization')).then((user) => {
      if (!permissions || permissions.length === 0) {
        return Promise.resolve(user);
      }

      let count = 0;
      let userPermissions = user.permissions || [];

      // in case of scoped permissions use globals
      if (!Array.isArray(userPermissions) && userPermissions.global) {
        // userPermissions = userPermissions.global;
        userPermissions = this.merge(userPermissions);
      }

      for (const permission of permissions) {
        if (userPermissions.indexOf(permission) !== -1) {
          count++;
        }
      }

      if (count === permissions.length) {
        return Promise.resolve(user);
      }

      let pstr = '';
      for (let i = 0; i < permissions.length; i++) {
        pstr += permissions[i];
        if (i < permissions.length - 1) {
          pstr += ',';
        }
      }
      return Promise.reject(
        new ApplicationError('insufficient_scope', `Missing required permission ${pstr}`, 'system_auth_basic')
      );
    });
  }

  private merge(data): Array<string> {
    let ret = [];
    for (const name of Object.getOwnPropertyNames(data)) {
      ret = ret.concat(data[name]);
    }
    return ret;
  }
}
