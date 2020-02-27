import { Engine } from '..';
import { Component } from './index';
import { connect } from 'tls';
import { ApplicationError } from '../error';

let logger;

export class Memory implements Component {
  private id;
  private conf;
  private client;
  private _salt;
  private _cipher;
  private _crypto = require('crypto');

  constructor(private system: Engine) {
    logger = system.log.log('engine:memory');
    this.conf = system.configuration.get('memory');
    this.id = system.configuration.get('system').id.toLowerCase();
    this._salt = system.configuration.get('system').salt;

    this.conf.options = this.conf.options || {};
    this.conf.options.retry_strategy = function(options) {
      if (options.error && options.error.code === 'ECONNREFUSED') {
        return new Error('Unable to connect to memory cluster');
      }
    };
  }

  init(): Promise<any> {
    return new Promise((resolve, reject) => {
      var Redis = require('ioredis');
      logger.info(
        `Connecting to memory cluster ${this.conf.name} using ${this.conf.model} model`
      );

      switch (this.conf.model) {
        case 'sentinel':
          this.client = new Redis({
            sentinels: this.conf.hosts,
            name: this.conf.name,
            password: this.conf.password
          });
          this.client.on('error', err => {
            logger.warn(err.message);
          });
          this.client.on('connect', () => {
            logger.info('Memory back-end connected');
            return resolve();
          });
          break;
        case 'direct':
          this.client = new Redis({
            host: this.conf.host,
            port: this.conf.port,
            password: this.conf.password
          });
          this.client.on('error', err => {
            logger.warn(err.message);
          });
          this.client.on('connect', () => {
            logger.info('Memory back-end connected');
            return resolve();
          });
          break;
        default:
          return reject('Unsupported memory connector model');
      }
    });
  }

  release(): Promise<any> {
    this.client.quit();
    logger.info('Released');
    return Promise.resolve();
  }

  async get(key: string): Promise<any> {
    const rkey = this.id + '-' + key;

    return new Promise((resolve, reject) => {
      this.client.get(rkey, (err, data) => {
        if (err) {
          logger.error(err);
          return reject(
            new ApplicationError(
              'system_error',
              'Error getting data from memory store',
              'sys_mem_get1'
            )
          );
        }

        if (!data) {
          return resolve();
        }

        if (this.conf.secure === true) {
          data = this.decrypt(rkey, data);
        }

        data = JSON.parse(data);
        return resolve(data._payload || data);
      });
    });
  }

  async set(key: string, value: any, ttl?: number) {
    const rkey = this.id + '-' + key;
    let data;

    if (typeof value === 'object') {
      data = JSON.stringify(value);
    } else {
      data = JSON.stringify({ _payload: value });
    }

    if (this.conf.secure === true) {
      data = this.encrypt(rkey, data);
    }

    if (ttl && ttl > 0) {
      this.client.setex(rkey, ttl, data);
    } else {
      this.client.set(rkey, data);
    }
  }

  async remove(key: string) {
    this.client.del(this.id + key);
  }

  private encrypt(secret, data) {
    const cipher = this._crypto.createCipher('aes-192-cbc', secret);
    data = cipher.update(data, 'utf8', 'hex');
    data += cipher.final('hex');
    return data;
  }

  private decrypt(secret, data) {
    const decipher = this._crypto.createDecipher('aes-192-cbc', secret);
    data = decipher.update(data, 'hex', 'utf8');
    data += decipher.final('utf8');
    return data;
  }
}
