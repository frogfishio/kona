import { IJob } from "./types";

module.exports.nextRun = (job: IJob): number => {
  const { DateTime } = require('luxon');
  const now = DateTime.local();

  if (job.run.model === 'now') {
    return now.toMillis();
  }

  if (job.run.model === 'daily') {
    const start = new DateTime(`${now.year}-${now.month}-${now.day}T${job.run.at}:00Z`);
    if (start.toMillis() > now.toMillis()) {
      return start.plus({ days: 1 }).toMillis();
    }

    return start.toMillis();
  }

  return 0;
}
