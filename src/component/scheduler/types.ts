export interface IRunSpec {
  model: string | Array<string>; // now, daily, weekly [mon,tue,wed], monthly[1-31], yearly:[30/12,11/11], schedule (one or more)
  repeat?: string; // how many times to repeat or forever
  at?: string; // what time should it run e.g. 23:33
  delay?: number; // 1 = once a minute
}

export interface IJob {
  version: number; // job version
  type: string; // type of a job handler
  group: string; // job group or default
  params?: any; // parameters to send to the job
  name: string; // job name
  code: string;
  status: string; // scheduled, claimed, running, failed, completed, locked, waiting
  description?: string; // description of a job
  run?: IRunSpec; // forever, once, daily, weekly, dow, monthly, yearly, date, schedule
  claim?: string; // uuid of claimad
  claim_expire?: number; // timestamp
  activate?: number; // timestamp of when the job will be active
  meta?: any; // job meta data
  state?: any; // transitive job state
  error?: any; // error data in case when state === 'failed'
}

export interface IJObStatus {
  status: string; // completed, reschedule, paused
  state?: any; // job carry-on state
  error?: any; // error message in case where status = failed
}
