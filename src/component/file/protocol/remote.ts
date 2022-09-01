import { Engine } from '../../..';
import { ApplicationError } from '../../../error';
import { Counter } from './counter';
import fetch from 'node-fetch';
import { LocalProtocol } from './local';

let logger;

export class RemoteProtocol {
  constructor(private _system: Engine, private _conf) {
    logger = _system.log.log('engine:file:local');
  }

  async init(): Promise<any> {
    logger.info('Initialising Remote File Protocol');
  }

  async create(file, name?: string): Promise<any> {
    const uuid = require('uuid').v4();

    const FormData = require('form-data');
    const formData = new FormData();

    let counter = new Counter();
    file.pipe(counter);

    formData.append('file', counter, name || uuid + this._conf.suffix);
    formData.append('id', `${this._conf.prefix}${uuid}`);

    const axios = require('axios').default;
    axios.defaults.headers.common['Authorization'] = this._conf.token;

    const res = await axios.post(
      this._conf.store,
      formData
    );

    const result = {
      id: uuid,
      length: counter.count,
      mime: counter.mime,
      // mime: counter.mime || this._conf.mime,
      digest: counter.shasum.digest('hex'),
    };
    // console.log(JSON.stringify(result, null, 2));
    return result;
  }

  async remove(fileId: string): Promise<any> {
    return new Promise((resolve, reject) => {});
  }

  async get(fileId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const fs = require('fs');
      const path = this._conf.store + '/' + fileId;

      fs.exists(path, (exists) => {
        if (exists) {
          return resolve(fs.createReadStream(path));
        }
        return reject(new ApplicationError('not_found', `File ${fileId} not found`, 'sys_file_local_get'));
      });
    });
  }
}
