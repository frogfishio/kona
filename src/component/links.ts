import { ApplicationError } from '../error';
import { Component } from './index';
import { Engine } from '..';

let logger;

interface ILink {
  type: string;
  from: string;
  to: string;
  meta?: any;
}
export class Links implements Component {
  private stats = {};

  constructor(private engine: Engine) {
    logger = engine.log.log('stats');
  }

  async add(type: string, from: string, to: string, meta?: any): Promise<any> {
    const link: ILink = { type: type, from: from, to: to, meta: meta };
    return this.engine.db.create('_links', this.engine.systemUser.account, require('../util').strip(link));
  }

  async remove(type: string, from: string, to: string): Promise<any> {
    return this.engine.db.findOne('_links', { type: type, from: from, to: to }).then((found) => {
      return this.engine.db.remove('_links', found._uuid);
    });
  }

  async removeAll(from: string, criteria?: any): Promise<any> {
    if (!from) {
      throw new ApplicationError('invalid_request', 'Filter owner must be specified', 'sys_link_rma1');
    }
    criteria = criteria || {};
    criteria.from = from;
    this.engine.db.removeAll('_links', criteria);
  }

  async find(criteria?: any): Promise<ILink> {
    criteria = criteria || {};
    return this.engine.db.find('_links', {
      where: criteria,
      filter: ['_uuid', 'type', 'from', 'to'],
    });
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
