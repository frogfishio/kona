import { ApplicationError } from '../error';

module.exports = (value: string) => {
  if (!value) {
    return '';
  }
  value = '' + value;

  let ret;
  switch (value.charAt(0)) {
    case '$':
      ret = process.env[value.substring(1)];
      if (!ret) {
        throw new ApplicationError(
          'configuration_error',
          `Environment variable ${value.substring(1)} does not exist`,
          'sys_conn_rev1'
        );
      }
      return ret;
    case '#':
      ret = process.env[value.substring(1)];
      if (!ret) {
        throw new ApplicationError(
          'configuration_error',
          `Environment variable ${value.substring(1)} does not exist`,
          'sys_conn_rev1'
        );
      }
      return Buffer.from(ret, 'base64');
    case '@':
      try {
        return require('fs').readFileSync(value.substring(1));
      } catch (err) {
        throw new ApplicationError('configuration_error', `Error reading configured file ${ret}`, 'sys_conn_rev1');
      }
    default:
      return value;
  }
};
