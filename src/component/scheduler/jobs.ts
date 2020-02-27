import { IJob } from './types';
import { Engine } from '../../index';
import { ApplicationError } from '../../error';
import { SyntacticJobValidator } from './syntactic-validator';

let logger;

export class Jobs {
  private _db;
  private _audit;
  private _validator = new SyntacticJobValidator();

  constructor(private _engine: Engine) {
    logger = _engine.log.log('engine:scheduler:jobs');
    this._db = _engine.db;
    this._audit = _engine.audit;
  }

  async create(job: any): Promise<any> {
    return this._db.create('_jobs', this._engine.systemUser.account, this.sanitize(job));
  }

  async get(jobId: string): Promise<any> {
    return this._db.findOne('_jobs', { _uuid: jobId });
  }

  async find(criteria?: any, skip?: number, limit?: number): Promise<any> {
    criteria = criteria || {};
    if (skip) {
      criteria.skip = skip;
    }
    if (limit) {
      criteria.limit = limit;
    }

    return this._db.find('_jobs', criteria);
  }

  async findOne(criteria): Promise<any> {
    return this._db.findOne('_jobs', criteria);
  }

  async update(jobIdOrFilter: string | any, job: any): Promise<any> {
    return this._db.update('_jobs', jobIdOrFilter, this.sanitizeUpdate(job));
  }

  async remove(jobId: string): Promise<any> {
    return this._db.remove('_jobs', jobId);
  }

  private sanitizeUpdate(data: any) {
    let job: IJob = {
      version: data.version,
      code: data.code,
      group: data.group,
      status: data.status,
      run: data.run,
      activate: data.activate,
      type: data.type,
      name: data.name,
      description: data.description,
      params: data.params,
      meta: data.meta,
      claim: data.claim,
      claim_expire: data.claim_expire,
      state: data.state,
      error: data.status === 'failed' ? data.error : null
    };

    job = require('../../util/strip')(job);
    logger.debug(`Job: ${JSON.stringify(job, null, 2)}`);

    for (const name of Object.getOwnPropertyNames(job)) {
      if (this._validator[name]) {
        job[name] = this._validator[name](job[name]);
      }
    }

    logger.debug(`Sanitised update job: ${JSON.stringify(job, null, 2)}`);
    return job;
  }

  private sanitize(data: any): IJob {
    if (!data) {
      throw new ApplicationError('validation_error', 'Can not create empty job', 'engine_scheduler_san0');
    }
    if (!data.run) {
      throw new ApplicationError('validation_error', 'Job must have run definition', 'engine_scheduler_san1');
    }
    if (!data.type) {
      throw new ApplicationError('validation_error', 'Job must have a type', 'engine_scheduler_san2');
    }
    if (!data.name) {
      throw new ApplicationError('validation_error', 'Job must have a name', 'engine_scheduler_san3');
    }

    let job: IJob = {
      version: parseInt(data.version) || 1,
      code: data.code || require('shortid').generate(),
      group: data.group || 'default',
      status: data.status || 'waiting',
      run: data.run,
      type: data.type,
      name: data.name,
      description: data.description,
      params: data.params,
      meta: data.meta,
      state: data.state
    };

    job.activate = require('./util').nextRun(job);
    const { DateTime } = require('luxon');
    if (DateTime.local().toMillis() >= job.activate) {
      job.status = 'ready';
    }

    job = require('../../util/strip')(job);

    logger.debug(`Job: ${JSON.stringify(job, null, 2)}`);

    for (const name of Object.getOwnPropertyNames(job)) {
      if (this._validator[name]) {
        job[name] = this._validator[name](job[name]);
      }
    }

    return job;
  }
}
