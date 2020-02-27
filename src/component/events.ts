import { Engine } from '..';
import { Component } from './index';

let logger;

export class Events implements Component {
  private eventSubscribers = [];

  constructor(private engine: Engine) {
    logger = engine.log.log('engine:events');
  }

  signal(message: string, params: any) {
    logger.debug(`Signaling ${message}`);
    const subs = this.eventSubscribers[message];
    if (subs) {
      for (const sub of subs) {
        sub.handle(params).catch(err => {
          logger.error(err);
        });
      }
    }
  }

  subscribe(message: string, subscriber: any) {
    if (subscriber) {
      const subs = this.eventSubscribers[message] || [];
      if (subs.indexOf(subscriber) === -1) {
        subs.push(subscriber);
      }
      this.eventSubscribers[message] = subs;
    }
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
