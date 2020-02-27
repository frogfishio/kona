import { ApplicationError } from '../error';

module.exports = (user: any, requiredPermissions: string | Array<string>, accountScope?: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (!user || !user.permissions || user.permissions.length === 0) {
      return reject(new ApplicationError('auth_error', 'Not authorised', '8640559586'));
    }

    let count = 0;
    const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
    const userPermissions = user.permissions || [];

    for (const permission of permissions) {
      if (userPermissions.indexOf(permission) !== -1) {
        count++;
      }
    }

    if (count !== permissions.length) {
      return reject(new ApplicationError('insufficient_scope', 'Insufficient privilege', '9625573689'));
    }

    return resolve();
  });
};
