import { Engine } from '../../..';
import { ApplicationError } from '../../../error';
import { Counter } from './counter';

let logger;

export class LocalProtocol {
  constructor(private system: Engine, private conf) {
    logger = system.log.log('engine:file:local');
  }

  async init(): Promise<any> {
    return new Promise((resolve, reject) => {
      logger.info('Initialising Local File Protocol');
      return resolve(null);
    });
  }

  async create(file, name?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const fs = require('fs');
      const uuid = require('uuid').v4();
      const out = fs.createWriteStream(this.conf.store + '/' + uuid);
      let typebuf;

      let counter = new Counter();
      file
        .pipe(counter)
        .pipe(out)
        .on('error', err => {
          return reject(err);
        })
        .on('close', () => {
          return resolve({
            id: uuid,
            mime: counter.mime,
            length: counter.count,
            digest: counter.shasum.digest('hex')
          });
        });
    });
  }

  async remove(fileId: string): Promise<any> {
    return new Promise((resolve, reject) => {});
  }

  async get(fileId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const fs = require('fs');
      const path = this.conf.store + '/' + fileId;

      fs.exists(path, exists => {
        if (exists) {
          return resolve(fs.createReadStream(path));
        }
        return reject(new ApplicationError('not_found', `File ${fileId} not found`, 'sys_file_local_get'));
      });
    });
  }
}
