import { ApplicationError } from '../../error';
import { Engine } from '../..';
import { Init } from '../init';

let logger;

export class SoapConnector {
  private _client;

  constructor(private _engine: Engine, private _conf: any) {
    logger = _engine.log.log('engine:connector:soap');
    logger.debug(`SOAP connector with URL ${this._conf.url} created`);
  }

  async init(): Promise<SoapConnector> {
    const soap = require('soap');
    try {
      this._client = await soap.createClient(this._conf.url);
      return this;
    } catch (err) {
      logger.error(err);
      throw new ApplicationError('system_error', 'SOAP connector client failed initialization', 'sys_conn_soap_init');
    }
  }

  async invoke(functionName: string, data: any) {
    if (!this._client) {
      throw new ApplicationError(
        'system_error',
        `SOAP connector not ready, tryng to invoke function ${functionName}`,
        'sys_conn_soap_invoke1'
      );
    }

    try {
      const result = await this._client[functionName](data);
      console.log(result);
    } catch (err) {
      logger.error(err);
      throw new ApplicationError(
        'system_error',
        `Failed SOAP method invocation ${functionName}`,
        'sys_conn_soap_invoke2'
      );
    }

    // this._client.MyFunction(, function(err, result) {
    //   console.log(result);
    // });
  }
}

export default function(engine: Engine, conf) {
  return new SoapConnector(engine, conf);
}
