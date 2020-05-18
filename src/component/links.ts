import { ApplicationError } from '../error';
import { Component } from './index';
import { Engine } from '..';

let logger;

interface ILink {
  type: string;
  from: string;
  to: string;
  scope?: string;
  meta?: any;
}

export class Links implements Component {
  private stats = {};

  constructor(private engine: Engine) {
    logger = engine.log.log('engine:links');
  }

  async add(type: string, from: string, to: string, scope?: string, meta?: any): Promise<any> {
    const link: ILink = { type: type, from: from, to: to, meta: meta };
    return this.engine.db.create('_links', this.engine.systemUser.account, this.sanitise(link));
  }

  async remove(type: string, from: string, to?: string, scope?: string): Promise<any> {
    return this.engine.db.removeAll(
      '_links',
      require('../util').strip({ type: type, from: from, to: to, scope: scope })
    );
  }

  async find(criteria?: any): Promise<Array<ILink>> {
    criteria = criteria || {};
    return this.engine.db.find('_links', {
      where: criteria,
      filter: ['_uuid', 'type', 'from', 'to', 'scope', 'meta'],
    });
  }

  private sanitise(data) {
    return require('../util').strip({
      type: data.type,
      from: data.from,
      to: data.to,
      scope: data.scope,
      meta: data.meta,
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
