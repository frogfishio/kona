import { ApplicationError } from '../../error';
import { Component } from '../index';
import { Engine } from '../../index';
import { EmailHandler } from './handler/email';

let logger;

export class Responder implements Component {
  private conf;
  private localCache = {};

  constructor(private engine: Engine) {
    logger = engine.log.log('engine:responder');
    this.conf = engine.configuration.get('responder') || {};
  }

  init(): Promise<any> {
    const responderNames = Object.getOwnPropertyNames(this.conf);
    for (const responder of responderNames) {
      const handlers = Object.getOwnPropertyNames(this.conf[responder]);
      for (const handler of handlers) {
        switch (handler) {
          case 'email':
          logger.info(`Registering email responder for ${responder}`);
          this.engine.events.subscribe(responder, new EmailHandler(this.engine, this.conf[responder][handler]));
            break;
          default:
            logger.error(`Unsupported handler type specified ${handler}`);
        }
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
