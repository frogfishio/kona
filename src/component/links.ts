import { ApplicationError } from '../error';
import { Component } from './index';
import { Engine } from '..';

let logger;

export class Links implements Component {
  private stats = {};

  constructor(private engine: Engine) {
    logger = engine.log.log('stats');
  }

  add(type: string, from: string, to: string): Promise<any> {
    return this.engine.db.create('_links', this.engine.systemUser.account, { type: type, from: from, to: to });
  }

  remove(type: string, from: string, to: string): Promise<any> {
    return this.engine.db.findOne('_links', { type: type, from: from, to: to }).then(found => {
      return this.engine.db.remove('_links', found._uuid);
    });
  }

  init(): Promise<any> {
    logger.info('Initialised');
    return Promise.resolve();
  }

  release(): Promise<any> {
    logger.info('Released');
    return Promise.resolve();
  }
}
