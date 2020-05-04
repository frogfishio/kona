import { ApplicationError } from '../error';
import { Component } from './index';
import { Engine } from '..';
import { DB } from './db';

let logger;

export interface IUserRole {
  user: string;
  role: string;
  status: string;
  expires?: number;
  reference?: string;
}

export class UserRole {
  private db: DB;
  private conf;

  constructor(private engine: Engine) {
    logger = engine.log.log('engine:user-role');
    this.db = engine.db;
  }

  async create(mapping: IUserRole): Promise<any> {}

  private static sanitiseRole(data) {
    return require('../util').strip({
      name: data.name,
      code: data.code,
      parent: data.parent,
      permissions: data.permissions,
      description: data.description,
      status: data.status || 'active',
      context: data.context,
    });
  }
}
