import { ApplicationError } from '../../error';
import { Engine } from '../..';

let logger;

export class BasicAuth {
  constructor(private enigne: Engine) {
    logger = enigne.log.log('engine:auth:basic');
  }

  authenticate(req, permissions): Promise<any> {
    logger.debug(`Authenticating user against ${JSON.stringify(permissions)}`);
    return this.enigne.auth.resolve(req.header('authorization')).then(user => {
      if (!permissions || permissions.length === 0) {
        return Promise.resolve(user);
      }

      let count = 0;
      const userPermissions = user.permissions || [];
      for (const permission of permissions) {
        if (userPermissions.indexOf(permission) !== -1) {
          count++;
        }
      }

      if (count === permissions.length) {
        return Promise.resolve(user);
      }

      return Promise.reject(new ApplicationError('insufficient_scope', 'Insufficient privilege', 'system_auth_basic'));
    });
  }
}
