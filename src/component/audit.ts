import { ApplicationError } from '../error';
import { Component } from './index';
import { Engine } from '..';
import { DB } from './db';

let logger;

export class Audit implements Component {
  private db: DB;

  constructor(private engine: Engine) {
    logger = engine.log.log('engine:audit');
    this.db = engine.db;
  }

  async find(criteria: any, skip: number, limit: number): Promise<any> {
    criteria = criteria || {};

    return this.db.find('_audit', {
      where: criteria,
      skip: skip,
      limit: limit
    });
  }

  async get(auditId: string): Promise<any> {
    return this.db.get('_audit', auditId);
  }

  async create(userId: string, context: string, message: string, meta?: any): Promise<any> {
    if (!userId) {
      throw new ApplicationError('validation_error', 'User ID must be specified for Audit', 'engine_audit_create1');
    }
    if (typeof userId !== 'string') {
      throw new ApplicationError('validation_error', 'User ID must be a string', 'engine_audit_create2');
    }
    if (!context) {
      throw new ApplicationError('validation_error', 'Audit context must be provided', 'engine_audit_create3');
    }
    if (!message) {
      throw new ApplicationError('validation_error', 'Audit message must be provided', 'engine_audit_create4');
    }
    logger.debug(`${context}: ${message}`);
    return this.db.create(
      '_audit',
      this.engine.systemUser.account,
      require('../util/strip')({ user: userId, context: context, message: message, meta: meta })
    );
  }

  init(): Promise<any> {
    logger.info('Initialised');
    return Promise.resolve();
  }

  release(): Promise<any> {
    logger.info('Released');
    return Promise.resolve();
  }
}

export default function(engine: Engine) {
  return new Audit(engine);
}
