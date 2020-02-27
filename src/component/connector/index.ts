import { ApplicationError } from '../../error';
import { Component } from '../index';
import { Engine } from '../..';
import { HttpConnector } from './http';
import { SoapConnector } from './soap';

let logger;

export class Connector implements Component {
  private _conf;
  private _request = require('request');
  private _connectors = {};

  constructor(private _engine: Engine) {
    logger = _engine.log.log('engine:connector');
    this._conf = _engine.configuration.get('connectors');
  }

  connector(name: string) {
    return this._connectors[name];
  }

  async init(): Promise<any> {
    for (const name of Object.getOwnPropertyNames(this._conf)) {
      switch (this._conf[name].type) {
        case 'http':
          this._connectors[name] = new HttpConnector(this._engine, this._conf[name]);
          break;
        case 'soap':
          this._connectors[name] = await new SoapConnector(this._engine, this._conf[name]).init();
          break;
        default:
          throw new ApplicationError(
            'system_error',
            `Unsupported connector type ${this._conf[name].type} for connector ${name}`,
            'sys_connector_init'
          );
      }
    }
    logger.info('Initialised');
    return Promise.resolve();
  }

  release(): Promise<any> {
    logger.info('Released');
    return Promise.resolve();
  }
}

export default function(engine: Engine) {
  return new Connector(engine);
}
