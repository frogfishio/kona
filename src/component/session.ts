import { Engine } from '..';
import { Component } from './index';
import { ApplicationError } from '../error';

const SESSION_EXPIRY = 31536000; // 1 year

let logger;

export class Session implements Component {
  private memory;

  constructor(private engine: Engine) {
    this.memory = engine.memory;
    logger = engine.log.log('engine:session');
  }

  async get(sessionId: string): Promise<any> {
    if (!sessionId) {
      return Promise.reject(new ApplicationError('not_found', 'Session not found', '9561517991'));
    }

    return this.decrypt(sessionId).then(id => {
      return this.memory.get(`session-${id}`);
    });
  }

  async set(sessionId: string, data: any): Promise<any> {
    if (!sessionId) {
      data = this.create(data);
      this.memory.set(`session-${data._uuid}`, data, SESSION_EXPIRY);
      return this.encrypt(data._uuid).then(id => Promise.resolve({ id: id }));
    }

    return this.decrypt(sessionId).then(id => {
      return this.memory.get(`session-${id}`).then(result => {
        data = require('../util/strip')(data);
        for (const name of Object.getOwnPropertyNames(data)) {
          result[name] = data[name];
        }

        result.updated = Date.now();
        result.expires = new Date(Date.now() + SESSION_EXPIRY);
        this.memory.set(`session-${id}`, result, SESSION_EXPIRY);
        return Promise.resolve({ id: sessionId });
      });
    });
  }

  private create(data: any) {
    data = require('../util/strip')(data);
    const now = Date.now();
    data._uuid = require('uuid').v4();
    data._created = now;
    data._updated = now;
    data._expires = new Date(Date.now() + SESSION_EXPIRY);

    return data;
  }

  async init(): Promise<any> {
    logger.info('Initialised');
    return Promise.resolve();
  }

  async release(): Promise<any> {
    logger.info('Released');
    return Promise.resolve();
  }

  private async encrypt(id: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const crypto = require('crypto');
      const cipher = crypto.createCipher('aes192', this.engine.configuration.get('system').salt);

      let encrypted = '';
      cipher.on('readable', () => {
        const data = cipher.read();
        if (data) {
          encrypted += data.toString('hex');
        }
      });
      cipher.on('end', () => {
        logger.debug(encrypted);
        // Prints: ca981be48e90867604588e75d04feabb63cc007a8f8ad89b10616ed84d815504
        return resolve(encrypted);
      });

      cipher.write(id);
      cipher.end();
    });
  }

  private async decrypt(id: string): Promise<any> {
    logger.debug(`Decrypting: ${id}`);
    return new Promise((resolve, reject) => {
      try {
        const crypto = require('crypto');
        const decipher = crypto.createDecipher('aes192', this.engine.configuration.get('system').salt);

        let decrypted = '';
        decipher.on('readable', () => {
          const data = decipher.read();
          if (data) {
            decrypted += data.toString('utf8');
          }
        });
        decipher.on('end', () => {
          logger.debug(decrypted);
          // Prints: ca981be48e90867604588e75d04feabb63cc007a8f8ad89b10616ed84d815504
          return resolve(decrypted);
        });

        decipher.write(id, 'hex');
        decipher.end();
      } catch {
        return reject(new ApplicationError('invalid_request', 'Invalid session identifier', '6280314761'));
      }
    });
  }
}
