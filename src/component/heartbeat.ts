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
          if (subscriber.sleep) {
            if (subscriber.sleep <= Date.now()) {
              subscriber.subscriber(subscriber.id);
            }
          } else {
            subscriber.subscriber(subscriber.id);
          }
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

  subscribe(name: string, interval: number, subscriber, sleep?: number) {
    this.subscribers.push({
      id: require('uuid').v4(),
      name: name,
      subscriber: subscriber,
      interval: interval,
      sleep: sleep ? Date.now() + sleep * 1000 : 0,
    });
  }

  unsubscribe(subscriberId) {
    for (let i = 0; i < this.subscribers.length; i++) {
      if (this.subscribers[i].id === subscriberId) {
        this.subscribers.splice(i, 1);
        break;
      }
    }
  }

  sleep(subscriberId, seconds: number) {
    for (const sub of this.subscribers) {
      if (sub.id === subscriberId) {
        sub.sleep = Date.now() + seconds * 1000;
        break;
      }
    }
  }
}
