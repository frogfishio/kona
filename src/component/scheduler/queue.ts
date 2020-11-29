import { Engine } from '../../index';

import { JobRunner } from './runner';

let logger;

export class JobQueue {
  private _running = false;
  private _queue = [];
  private _runner;
  private _locks = {};

  constructor(private _engine: Engine, private _group: string, private _conf: any) {
    logger = _engine.log.log('engine:scheduler:queue');
    this._runner = new JobRunner(_engine);
  }

  queue(job) {
    if (this.isLocked(job)) {
      logger.debug(`Dropping job ${job.name} already in a queue or locked`);
      return false;
    }

    this._queue.push(job);
    if (!this._running) {
      this._throttle();
    }
    return true;
  }

  private isLocked(job) {
    for (const qjob of this._queue) {
      if (qjob._uuid === job._uuid) {
        return true;
      }
    }

    if (this._locks[job._uuid]) {
      return true;
    }

    return false;
  }

  private lock(job) {
    this._locks[job._uuid] = true;
  }

  private unlock(job) {
    delete this._locks[job._uuid];
  }

  private async _throttle() {
    this._running = true;
    while (this._queue.length > 0) {
      await this._seq(this._queue.pop(), this.delay());
    }
    this._running = false;
  }

  private delay() {
    logger.debug(`Conf: ${JSON.stringify(this._conf, null, 2)}`);
    // TODO: Impl. real throttle calculation
    let ret = this._conf.throttle ? this._conf.throttle.second || 1 : 1;
    ret = ret * 1000;
    logger.debug(`Throttling wait: ${ret}`);
    return ret;
  }

  private async _seq(job: any, minimalTime?: number) {
    const timestamp = Date.now();
    await this._runner.start(job);
    const diff = timestamp + minimalTime - Date.now();

    if (diff > 0) {
      this.lock(job);
      await this._wait(diff);
      this.unlock(job);
    }
  }

  private async _wait(millis: number): Promise<any> {
    logger.debug(`Throttling for ${millis} milliseconds`);
    return new Promise(resolve => {
      setTimeout(() => resolve(null), millis);
    });
  }

  // private async _spread(parallelProcesses: number, jobs: Array<any>): Promise<any> {
  //   return new Promise(resolve => {
  //     let count = parallelProcesses;
  //     for (let i = 0; i < parallelProcesses; i++) {
  //       this._exec().then(() => {
  //         count--;
  //         if (count === 0) {
  //           resolve();
  //         }
  //       });
  //     }
  //   });
  // }

  private async _exec(job): Promise<any> {}
}
