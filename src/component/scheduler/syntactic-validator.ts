import { ApplicationError } from '../../error';
import { IJob, IRunSpec } from './types';

const STATUS_CODES = ['ready', 'scheduled', 'claimed', 'running', 'failed', 'completed', 'locked', 'waiting'];
const WEEK = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export class SyntacticJobValidator {
  version(data: number): number {
    if (!data) {
      throw new ApplicationError('validation_error', 'Job must have version', 'engine_scheduler_val_ver1');
    }
    if (Number.isNaN(parseInt('' + data))) {
      throw new ApplicationError('validation_error', 'Job version must be numeric', 'engine_scheduler_val_ver2');
    }
    return parseInt('' + data);
  }

  code(data: string): string {
    if (typeof data !== 'string' || data.length === 0) {
      throw new ApplicationError('validation_error', 'Job must have a code', 'engine_scheduler_val_code1');
    }

    return data;
  }

  group(data: string): string {
    if (typeof data !== 'string' || data.length === 0) {
      throw new ApplicationError('validation_error', 'Job must have a group', 'engine_scheduler_val_group1');
    }

    return data;
  }

  claim(data: string): string {
    return data;
  }

  claim_expire(data: string): string {
    return data;
  }

  state(data: any): any {
    return data;
  }

  status(data: string): string {
    if (!data) {
      throw new ApplicationError('validation_error', 'Job must have a status code', 'engine_scheduler_val_status1');
    }

    if (STATUS_CODES.indexOf(data) === -1) {
      throw new ApplicationError('validation_error', `Invalid status code ${data}`, 'engine_scheduler_val_status2');
    }

    return data;
  }

  activate(data) {
    return data;
  }
  run(run: IRunSpec): IRunSpec {
    if (!run) {
      throw new ApplicationError('validation_error', 'Job must have a run spec', 'engine_scheduler_val_run0');
    }

    if (!run.model) {
      throw new ApplicationError('validation_error', 'Job run spec must have a model', 'engine_scheduler_val_run1');
    }

    if (typeof run.model === 'string' && (run.model !== 'now' && run.model !== 'daily')) {
      throw new ApplicationError('validation_error', `Invalid run model ${run.model}`, 'engine_scheduler_val_run3');
    }

    if (run.model === 'daily' && !run.at) {
      throw new ApplicationError(
        'validation_error',
        `Run model ${run.model} requires at to be specified`,
        'engine_scheduler_val_run4'
      );
    }

    if (Array.isArray(run.model)) {
      if (run.model.length === 0) {
        throw new ApplicationError(
          'validation_error',
          `Run model ${run.model} must not be empty`,
          'engine_scheduler_val_run5'
        );
      }

      let pass = false;

      // weekday
      if (!pass && WEEK.indexOf(run.model[0])) {
        pass = true;
        for (const item of run.model) {
          if (WEEK.indexOf(item) === -1) {
            throw new ApplicationError(
              'validation_error',
              `Inconsistent run model ${run.model}`,
              'engine_scheduler_val_run6'
            );
          }
        }

        if (!run.at) {
          throw new ApplicationError(
            'validation_error',
            `Run model ${run.model} requires at to be specified`,
            'engine_scheduler_val_run7'
          );
        }
      }

      // date array
      if (!pass && run.model[0].indexOf(' ') !== -1) {
        pass = true;
        const split = run.model[0].split(' ');

        if (split.length !== 2) {
          throw new ApplicationError(
            'validation_error',
            `Invalid run model ${run.model} format, expected date and time`,
            'engine_scheduler_val_run8'
          );
        }

        if (split[0].indexOf('/') === -1) {
          throw new ApplicationError(
            'validation_error',
            `Invalid run model ${run.model} format, expected date and time`,
            'engine_scheduler_val_run9'
          );
        }

        if (split[0].indexOf(':') === -1) {
          throw new ApplicationError(
            'validation_error',
            `Invalid run model ${run.model} format, expected date and time`,
            'engine_scheduler_val_run10'
          );
        }
      }

      // montly
      if (!pass && run.model[0].indexOf('/') !== -1) {
        pass = true;
        const split = run.model[0].split(' ');

        if (split.length !== 2) {
          throw new ApplicationError(
            'validation_error',
            `Invalid run model ${run.model} format, expected day and month`,
            'engine_scheduler_val_run11'
          );
        }

        if (!run.at) {
          throw new ApplicationError(
            'validation_error',
            `Run model ${run.model} requires at to be specified`,
            'engine_scheduler_val_run12'
          );
        }
      }

      // day of month
      if (!pass && !Number.isNaN(parseInt(run.model[0]))) {
        pass = true;

        if (parseInt(run.model[0]) > 31) {
          throw new ApplicationError(
            'validation_error',
            `Invalid run model ${run.model} format, expected day of month`,
            'engine_scheduler_val_run13'
          );
        }

        if (!run.at) {
          throw new ApplicationError(
            'validation_error',
            `Run model ${run.model} requires at to be specified`,
            'engine_scheduler_val_run14'
          );
        }
      }

      if (!pass) {
        throw new ApplicationError('validation_error', `Invalid run model ${run.model}`, 'engine_scheduler_val_run15');
      }
    }

    if (run.model === 'daily' && !run.at) {
      throw new ApplicationError(
        'validation_error',
        `Daily run requires at to be specified`,
        'engine_scheduler_val_run16'
      );
    }

    const res: any = require('../../util/strip')({
      model: run.model,
      at: run.at,
      delay: run.delay
    });

    if (run.model === 'daily') {
      res.repeat = run.repeat || '1';
    }

    if ((res.repeat === 'forever' || parseInt(res.repeat) > 1) && !res.delay) {
      throw new ApplicationError(
        'validation_error',
        `Delay in minutes must be specified when repeat is set`,
        'engine_scheduler_val_run17'
      );
    }

    return res;
  }
}
