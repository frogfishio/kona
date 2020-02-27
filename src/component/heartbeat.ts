import { Engine } from '..';
import { Component } from './index';

let logger;

export class Heartbeat implements Component {
  private handle;
  private count = 0;
  private subscribers = [];

  constructor(private system: Engine) {
    logger = this.system.log.log('engine:heartbeat');
  }

  init(): Promise<any> {
    logger.info('Starting hearbeat at one second interval');

    this.handle = setInterval(() => {
      this.count++;
      for (const subscriber of this.subscribers) {
        if (this.count % subscriber.interval === 0) {
          subscriber.subscriber();
        }
      }
    }, 1000);

    logger.info('Initialised');
    return Promise.resolve();
  }

  release(): Promise<any> {
    clearInterval(this.handle);
    logger.info('Released');
    return Promise.resolve();
  }

  subscribe(name: string, interval: number, subscriber) {
    this.subscribers.push({
      name: name,
      subscriber: subscriber,
      interval: interval
    });
  }
}
