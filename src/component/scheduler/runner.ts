import { Engine } from '../..';
import { Jobs } from './jobs';
import { ApplicationError } from '../../error';
import { IJObStatus } from './types';
import { Job } from './job';

let logger;

export class JobRunner {
  private _jobs;
  private _audit;

  constructor(private _engine: Engine) {
    logger = _engine.log.log('engine:scheduler:runner');
    this._audit = _engine.audit;
    this._jobs = new Jobs(_engine);
  }

  async start(job) {
    try {
      await this._jobs.update(job._uuid, { status: 'running' });
      this._audit.create(this._engine.systemUser.id, 'scheduler', `${job.name} (${job._uuid}) [${job.type}] started`);

      const result = await this.run(job);
      logger.debug(`Job completed with status ${JSON.stringify(result, null, 2)}`);

      switch (result.status) {
        case 'failed':
          this.fail(job, result.error);
          break;
        case 'reschedule':
          this.reschedule(job, result);
          break;
        case 'completed':
          this.complete(job);
          break;
        default:
          throw new ApplicationError('system_error', `Invalid job result status ${result.status}`, 'sche_job_start');
      }
    } catch (err) {
      logger.error(err);
      await this.fail(job);
    }
  }

  private async complete(job) {
    logger.debug(`Job ${job.name} (${job._uuid}) [${job.type}] completed`);
    this._audit.create(this._engine.systemUser.id, 'scheduler', `${job.name} (${job._uuid}) [${job.type}] completed`);
    return this._jobs.update(job._uuid, { status: 'completed' });
  }

  private async fail(job, error?: any) {
    this._audit.create(this._engine.systemUser.id, 'scheduler', `${job.name} (${job._uuid}) [${job.type}] failed`);
    return this._jobs.update(job._uuid, { status: 'failed', error: error });
  }

  private async reschedule(job, result) {
    if (result.status === 'reschedule') {
      logger.debug(`Rescheduling job ${job.name}`);
      if (result.state) {
        await this._jobs.update(
          { _uuid: job._uuid },
          { status: 'ready', claim: null, claim_expire: null, state: result.state }
        );

        return { status: 'reschedule' };
      }
    }
  }

  private async run(job): Promise<IJObStatus> {
    try {
      logger.debug(`Running ${job.name}`);
      const result = await this._engine.scheduler.exec(job.type, new Job(job));
      logger.debug(`Got run result ${JSON.stringify(result)}`);

      if (!result || !result.status || result.status === 'completed') {
        return { status: 'completed' };
      }

      return result;
    } catch (err) {
      return { status: 'failed', error: err };
    }
  }
}
