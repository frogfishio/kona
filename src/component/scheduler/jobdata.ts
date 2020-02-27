import { Engine } from '../../index';

export class JobData {
  private _db;
  constructor(private _engine: Engine) {
    this._db = _engine.db;
  }

  async create(context: string, data: any): Promise<any> {
    data.context = context;
    return this._db.create('_jobdata', this._engine.systemUser.account, data);
  }

  async update(context: string, id: string, data: any): Promise<any> {
    const filter = { context: context, _uuid: id };
    return this._db.update('_jobdata', filter, data);
  }

  // async get(context: string, id: string): Promise<any> {}

  async find(context: string, filter: any, skip?: number, limit?: number): Promise<any> {
    filter = filter || {};
    context = context;
    return this._db.find('_jobdata', filter);
  }
}
