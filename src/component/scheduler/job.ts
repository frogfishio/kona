import { IJob } from './types';

export class Job {
  get params() {
    return this._job.params;
  }

  get state() {
    return this._job.state;
  }

  get name() {
    return this._job.name;
  }

  get type() {
    return this._job.type;
  }
  
  constructor(private _job: IJob) {}
}
