import { Engine } from '../..';
import { Component } from '../index';

import { LocalProtocol } from './protocol/local';
import { S3Protocol } from './protocol/s3';
import { DB } from '../db/index';
import { ReadStream } from 'fs';

let logger;

export class Files implements Component {
  private conf;
  private db: DB;
  private connectors: any = {};

  constructor(private engine: Engine) {
    logger = engine.log.log('engine:file');
    this.db = engine.db;
    this.conf = engine.configuration.get('file');
  }

  async init(): Promise<any> {
    if (!this.conf) {
      return Promise.resolve();
    }

    logger.info('Initialising file store');
    const names = Object.getOwnPropertyNames(this.conf);
    return names.reduce((promise, connectorName) => {
      return promise.then(() => {
        switch (this.conf[connectorName].type) {
          case 'local':
            this.connectors[connectorName] = new LocalProtocol(this.engine, this.conf[connectorName]);
            return this.connectors[connectorName].init();
          case 's3':
            this.connectors[connectorName] = new S3Protocol(this.engine, this.conf[connectorName]);
            return this.connectors[connectorName].init();
          default:
            return Promise.reject('SYSTEM ERROR!!!');
        }
      });
    }, Promise.resolve());
  }

  async release(): Promise<any> {
    logger.info('Released');
    return Promise.resolve();
  }

  async list(fileStoreName: string, fileId: string, filter: any): Promise<any> {
    return new Promise((resolve, reject) => {});
  }

  async create(fileName: string, file: ReadableStream, fileStoreName?: string, meta?: any): Promise<any> {
    fileStoreName = fileStoreName || Object.getOwnPropertyNames(this.conf)[0];

    return this.connectors[fileStoreName].create(file).then(result => {
      if (!this.conf[fileStoreName].track) {
        return Promise.resolve({ id: result.id });
      }

      const fileInfo: any = {
        digest: result.digest,
        length: result.length,
        // payload: result.id,
        mime: result.mime,
        name: fileName,
        meta: meta,
        _uuid: result.id
      };

      if (!fileInfo.mime) {
        const mime = require('mime/lite');
        fileInfo.mime = mime.getType(fileInfo.name);
      }

      logger.debug('Creating file: ' + JSON.stringify(fileInfo, null, 2));

      return this.db.create('_files_' + fileStoreName, this.engine.systemUser.account, fileInfo).then(() => {
        return Promise.resolve({
          id: fileInfo._uuid,
          name: fileInfo.name,
          digest: fileInfo.digest,
          length: fileInfo.length,
          mime: fileInfo.mime
        });
      });
    });
  }

  async remove(fileId: string, fileStoreName?: string): Promise<any> {
    fileStoreName = fileStoreName || Object.getOwnPropertyNames(this.conf)[0];
    return this.connectors[fileStoreName].remove(fileId);
  }

  async update(fileId: string, fileDescriptor: any, file?: ReadableStream): Promise<any> {
    return new Promise((resolve, reject) => {});
  }

  async get(fileId: string, fileStoreName?: string, includePayload?: boolean): Promise<any> {
    fileStoreName = fileStoreName || Object.getOwnPropertyNames(this.conf)[0];

    // DEPRECATED: include payload
    if (includePayload) {
      return this.db.get('_files_' + fileStoreName, fileId).then(result => {
        return this.connectors[fileStoreName].get(result._uuid).then(payload => {
          result.payload = payload;
          return Promise.resolve(result);
        });
      });
    } else {
      return this.db.get('_files_' + fileStoreName, fileId);
    }
  }

  async payload(fileId: string, fileStoreName?: string): Promise<ReadStream> {
    fileStoreName = fileStoreName || Object.getOwnPropertyNames(this.conf)[0];
    return this.connectors[fileStoreName].get(fileId);
  }
}
