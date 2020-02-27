import { ApplicationError } from '../../error';
import { Component } from '../';
import { Engine } from '../..';
import { Job } from './job';
import { Jobs } from './jobs';
import { JobQueue } from './queue';
import { IJob } from './types';

let logger;

export class Scheduler implements Component {
  private _jobTypes = {};
  private _queue = {};

  private _conf;
  private _root;
  private _jobs;

  constructor(private _engine: Engine) {
    logger = _engine.log.log('engine:scheduler');
    this._conf = _engine.configuration.get('scheduler');
    this._root = _engine.configuration.get('system').root;
    this._jobs = new Jobs(_engine);
  }

  async create(job: IJob) {
    return this._jobs.create(job);
  }

  async find(filter: any, skip?: number, limit?: number) {
    return this._jobs.find(filter, skip, limit);
  }

  async get(jobId: string) {
    return this._jobs.get(jobId);
  }

  async update(jobId: string, data: any) {
    return this._jobs.update('' + jobId, data);
  }

  registerJobType(name: string, code: string, handler: (engine: Engine, job: Job) => Promise<any>) {
    this._jobTypes[code] = { name: name, handler: handler };
  }

  deregisterJobType(code: string) {
    delete this._jobTypes[code];
  }

  getRegisteredJobTypes() {
    let res = {};
    for (const code of Object.getOwnPropertyNames(this._jobTypes)) {
      res[code] = this._jobTypes[code].name;
    }
    return res;
  }

  async exec(code: string, job, params?: any): Promise<any> {
    if (!this._jobTypes[code]) {
      throw new ApplicationError('system_error', `Job type ${code} not registered`, 'system_scheduler_exec');
    }

    return this._jobTypes[code].handler(this._engine, job);
  }

  async init(): Promise<any> {
    logger.debug('Registering job types');

    // register core job type
    this.registerSignalEventJobType();

    // register configured job types
    this.registerJobTypes();

    // register READY scheduler
    this.registerHeartBeatHandler();

    // load configured jobs
    await this.loadJobs();

    logger.info('Initialised');
    return Promise.resolve();
  }

  async release(): Promise<any> {
    logger.info('Released');
    return Promise.resolve();
  }

  private queue(job) {
    if (!this._queue[job.group]) {
      this._queue[job.group] = new JobQueue(
        this._engine,
        job.group,
        this._conf && this._conf.groups && this._conf.groups[job.group] ? this._conf.groups[job.group] : {}
      );
    }

    return this._queue[job.group].queue(job);
  }

  // ======= private ======

  private async schedule(job: any) {
    logger.debug(`Scheduling job ${job.name}`);
    const claim = require('uuid').v4();
    const result = await this._jobs.update(
      { _uuid: job._uuid, status: 'ready' },
      { status: 'claimed', claim: claim, claim_expire: Date.now() }
    );

    logger.debug(`Result => ${JSON.stringify(result)}`);

    try {
      logger.debug(`Getting job ${job._uuid} with claim ${claim}`);
      job = await this._jobs.findOne({ _uuid: job._uuid, claim: claim });
      job.status = 'scheduled';
      await this._jobs.update(job._uuid, { status: 'scheduled' });

      // If shceduling fails, reschedule it
      if (!this.queue(job)) {
        logger.debug(`Rescheduling job ${job.name}`);
        await this._jobs.update({ _uuid: job._uuid }, { status: 'ready', claim: null, claim_expire: null });
      }
    } catch (err) {
      logger.error('Another process gazumped the job claim');
    }
  }

  private registerJobTypes() {
    if (this._conf && this._conf.job_types) {
      for (const code of Object.getOwnPropertyNames(this._conf.job_types)) {
        logger.debug(
          `Registering ${this._conf.job_types[code].name} from ${this._root + this._conf.job_types[code].handler}`
        );
        this.registerJobType(
          this._conf.job_types[code].name,
          code,
          require(this._root + this._conf.job_types[code].handler)
        );
      }
    }
  }

  private registerHeartBeatHandler() {
    this._engine.heartbeat.subscribe('Scheduler', this._conf.frequency || 60, async () => {
      logger.debug(`Checking scheduled jobs`);

      // TODO: this should look for more than ready + filter out claimed jobs
      const jobs = await this._jobs.find({ status: 'ready' });
      for (const job of jobs) {
        if (job.status === 'ready') {
          await this.schedule(job);
        }
      }
    });
  }

  private registerSignalEventJobType() {
    this.registerJobType(
      'Signal event',
      'signal',
      (engine: Engine, job: any): Promise<any> => {
        if (!job) {
          return Promise.reject(new ApplicationError('invalid_request', `Job not specified`, 'sche_job_se1'));
        }

        if (!job.params || !job.params.event) {
          return Promise.reject(
            new ApplicationError('invalid_request', `Event parameter required for this job`, 'sche_job_se2')
          );
        }
        engine.events.signal(job.params.event, job.params);
        return Promise.resolve();
      }
    );
  }

  private async loadJobs() {
    logger.debug(`Loading configured jobs`);
    if (!this._conf.jobs) {
      logger.debug('No configured jobs found');
      return;
    }

    for (const jobCode of Object.getOwnPropertyNames(this._conf.jobs)) {
      let job = this._conf.jobs[jobCode];
      job.code = jobCode;

      try {
        const foundJob = await this._jobs.findOne({ code: jobCode });
        if (foundJob.version < job.version) {
          logger.debug(`Updating existing job [${foundJob.name}] to a version ${job.version}`);
          await this._jobs.update(foundJob._uuid, job);
        } else {
        }
      } catch (err) {
        if (err.error === 'not_found') {
          logger.debug(`Creating a job [${job.name}]`);
          await this.create(job);
        } else {
          throw err;
        }
      }
    }
  }
}
