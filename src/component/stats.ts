import { ApplicationError } from '../error';
import { Component } from './index';
import { Engine } from '..';

let logger;

export class Stats implements Component {
  private stats = {};

  constructor(private engine: Engine) {
    logger = engine.log.log('engine:stats');
  }

  add(name: string, data: any, meta?: any) {
    let stat = this.stats[name];
    if (!stat) {
      stat = {
        count: 1,
        min: data.time,
        max: data.time,
        avg: data.time,
        in: data.in,
        out: data.out
      };
    } else {
      if (data.time < stat.min) {
        stat.min = data.time;
      }
      if (data.time > stat.max) {
        stat.max = data.max;
      }
      stat.avg = (stat.avg * stat.count + data.time) / (stat.count + 1);
      stat.in += data.in;
      stat.out += data.out;
      stat.count++;
    }

    logger.debug('Stat: ' + name + ' : ' + JSON.stringify(stat));
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
