import { ApplicationError } from '../../error';
import { DB } from '.';
import { Engine } from '../..';

let logger;
const mongo = require('mongodb');
const debug = require('debug')('engine:mongodb');

export class MongoDBProtocol implements DB {
  private db;
  private conf;
  private connection;

  constructor(private system: Engine) {
    logger = system.log.log('engine:db:mongo');
    this.conf = system.configuration.get('db');
  }

  async init(): Promise<any> {
    return new Promise((resolve, reject) => {
      let connectUrl = 'mongodb://';
      const dbName = this.conf.name;

      // // TODO: Figure out how to deal with this
      // if (this.conf.host !== 'localhost') {
      //   connectUrl = 'mongodb+srv://';
      // }

      if (this.conf.user && this.conf.password) {
        connectUrl += this.conf.user + ':' + this.conf.password + '@';
      }

      if (!this.conf.hosts) {
        connectUrl += this.conf.host;
        connectUrl += this.conf.port ? this.conf.port : '';
        connectUrl += '/' + this.conf.name;
      } else {
        for (let i = 0; i < this.conf.hosts.length; i++) {
          connectUrl += `${this.conf.hosts[0].host}:${this.conf.hosts[i].port}${
            i < this.conf.hosts.length - 1 ? ',' : ''
          }`;
        }
        connectUrl += `/${this.conf.name}?replicaSet=${this.conf.replicaset}&keepAlive=true&autoReconnect=true&socketTimeoutMS=0`;
      }

      logger.info('Connecting to MongoDB: ' + connectUrl);

      const MongoClient = mongo.MongoClient;
      MongoClient.connect(
        connectUrl,
        { native_parser: true, useNewUrlParser: true, useUnifiedTopology: true },
        (err, connection) => {
          if (err) {
            return reject(new ApplicationError('database_error', null, '3249567821', err));
          } else {
            this.connection = connection;
            this.db = connection.db(dbName);
            return resolve(null);
          }
        }
      );
    });
  }

  async release(): Promise<any> {
    this.connection.close();
    logger.info('Released');
    return Promise.resolve();
  }

  close() {
    this.connection.close();
  }

  private async getCollection(collectionName: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.collection(collectionName, (err, coll) => {
        if (err) {
          return reject(
            new ApplicationError('database_error', 'Error getting collection: ' + collectionName, 'sys_mdb_gc', err)
          );
        }

        return resolve(coll);
      });
    });
  }

  async get(collectionName: string, uuid: string, objectTypeName?: string, fileds?: Array<string>): Promise<any> {
    return this.find(collectionName, { where: { _uuid: uuid }, limit: 1 }).then((result) => {
      if (!result) {
        return Promise.reject(
          new ApplicationError('not_found', `Object in ${collectionName} not found`, 'sys_mdb_ge1')
        );
      }

      if (!fileds) {
        delete result._id;
      }
      return Promise.resolve(result);
    });
  }

  async findOne(collectionName: string, criteria, objectTypeName?: string, fileds?: Array<string>): Promise<any> {
    if (!criteria.where) {
      criteria = { where: criteria };
    }

    criteria.limit = 1;

    return this.find(collectionName, criteria).then((result) => {
      if (!result) {
        debug(`One not found in collection ${collectionName} criteria ${JSON.stringify(criteria)}`);
        return Promise.reject(
          new ApplicationError('not_found', `Object in ${collectionName} not found`, 'sys_mdb_fo1')
        );
      }

      if (!fileds) {
        delete result._id;
      }
      return Promise.resolve(result);
    });
  }

  async find(collectionName: string, params: any): Promise<any> {
    if (!params.where) {
      params = { where: params };
    }

    return this.getCollection(collectionName).then((collection) => {
      return new Promise((resolve, reject) => {
        if (!collection) {
          return reject(new ApplicationError('database_error', 'Collection not found', 'sys_mdb_gcol_null'));
        }

        const criteria = params.where || {};

        if (criteria._created) {
          criteria._created = Number(criteria._created);
        }

        if (criteria._updated) {
          criteria._updated = Number(criteria._updated);
        }

        if (!params.deleted) {
          criteria._deleted = { $ne: true };
        } else {
          if (params.deleted === true) {
            criteria._deleted = true;
          }
        }

        let criteriaFilter: any = { _id: 0 };

        if (typeof params.filter === 'string' && params.filter === 'all') {
          switch (params.filter) {
            case 'all':
              criteriaFilter = {};
              break;
            // case 'safe':
            //     break;
            default:
              return reject(
                new ApplicationError(
                  'database_error',
                  'Invalid filter specified "' + params.filter + '"',
                  'sys_mdb_fil'
                )
              );
          }
        } else {
          if (params.filter) {
            // criteriaFilter = {};
            for (let i = 0; i < params.filter.length; i++) {
              criteriaFilter[params.filter[i]] = 1;
            }
          }
        }

        if (params.exclude) {
          for (let i = 0; i < params.exclude.length; i++) {
            criteriaFilter[params.exclude[i]] = 0;
          }
        }

        let sort;

        if (params.order) {
          let count = 0;
          sort = {};
          const pnames = Object.getOwnPropertyNames(params.order);

          for (let i = 0; i < pnames.length; i++) {
            if (params.order[pnames[i]] === 'asc') {
              sort[pnames[i]] = 1;
              count++;
            } else if (params.order[pnames[i]] === 'desc') {
              sort[pnames[i]] = -1;
              count++;
            } else {
              logger.error('Invalid sorting instruction: ' + pnames[i]);
              break;
            }
          }

          // if (count > 0) {
          //   criteria = { $query: criteria, $orderby: order };
          // }
        }

        if (params.as !== 'array' && params.limit === 1) {
          criteriaFilter._id = 0;
          return collection.findOne(criteria, criteriaFilter, function (err, item) {
            if (err) {
              return reject(new ApplicationError('database_error', null, 'sys_mdb_fo', err));
            }

            return resolve(item);
          });
        }

        const names = Object.getOwnPropertyNames(criteria);
        for (let i = 0; i < names.length; i++) {
          if (Array.isArray(criteria[names[i]])) {
            criteria[names[i]] = { $in: criteria[names[i]] };
          }
        }

        debug(`Searching with criteria ${JSON.stringify(criteria)} and filter ${JSON.stringify(criteriaFilter)}`);

        // this.db
        //   .collection('test_data')
        //   .find({})
        //   .project({ hello: 0 })
        //   .toArray((err, data) => {
        //     console.log('DT: ' + JSON.stringify(data, null, 2));
        //   });

        collection.find(criteria, criteriaFilter, (err, result) => {
          if (err) {
            logger.error(err);
            return reject(new ApplicationError('database_error', null, 'sys_mdb_gcol_ff', err));
          }

          if (params.skip) {
            result.skip(params.skip);
          }

          if (params.limit) {
            result.limit(params.limit);
          }

          if (sort) {
            debug(`Sorting with ${JSON.stringify(sort)}`);
            result = result.sort(sort);
          }

          result.project(criteriaFilter).toArray((err, data) => {
            if (err) {
              logger.error(err);
              return reject(
                new ApplicationError(
                  'database_error',
                  'Error converting a data result to array',
                  'sys_mdb_gcol_tar',
                  err
                )
              );
            }
            return resolve(data);
          });
        });
      });
    });
  }

  async aggregate(collectionName: string, criteria): Promise<any> {
    criteria[0].$match._deleted = { $ne: true };

    // _deleted = {$ne: true};

    console.log('Aggregating criteria: ' + JSON.stringify(criteria, null, 2));

    return this.getCollection(collectionName).then((collection) => {
      return new Promise((resolve, reject) => {
        for (const i in criteria) {
          if (criteria[i].$match) {
            criteria[i] = MongoDBProtocol.sanitiseCriteria(criteria[i]);
          }
        }

        collection.aggregate(criteria).toArray((err, data) => {
          if (err) {
            return reject(new ApplicationError('database_error', null, 'sys_mdb_ag', err));
          }

          return resolve(data);
        });
      });
    });
  }

  async create(collectionName: string, owner: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!collectionName || !owner || !data) {
        return reject(
          new ApplicationError('validation_error', 'Invalid method usage, parameters not defined', 'sys_mdb_crv1')
        );
      }

      if (typeof owner !== 'string') {
        return reject(new ApplicationError('validation_error', 'Owner must be of a string type', 'sys_mdb_crv2'));
      }

      return this.getCollection(collectionName).then((collection) => {
        const uuid = require('uuid');
        data._created = Date.now();
        data._owner = owner;
        data._uuid = data._uuid || uuid.v4();
        data._updated = data._created;

        collection.insertOne(data, (err, result) => {
          if (err) {
            logger.debug(`Was trying to insert into collectton${collectionName}, data: ${JSON.stringify(data)}`);
            logger.error(err);
            return reject(
              new ApplicationError('database_error', 'Error saving object to database', 'sys_mdb_sav', err)
            );
          }

          return resolve({ id: data._uuid });
        });
      });
    });
  }

  async updateAll(collectionName: string, criteria: any, values: any): Promise<any> {
    const collection = await this.getCollection(collectionName);

    logger.debug(`Updating ${collectionName} with criteria: ${JSON.stringify(criteria)}`);

    return new Promise((resolve, reject) => {
      values._updated = Date.now();
      collection.update(criteria, { $set: values }, { multi: true }, (err, res) => {
        if (err) {
          return reject(
            new ApplicationError('database_error', `Error updating ${collectionName}`, 'sys_mdb_update1', err)
          );
        }

        return resolve({
          found: res.result.n,
          modified: res.result.nModified,
          updated: res.result.ok,
        });
      });
    });
  }

  async update(collectionName: string, idOrCriteria: string | any, data: any, objectTypeName?: string): Promise<any> {
    if (typeof idOrCriteria !== 'string') {
      logger.warn('Multi-update uwing update() method has been deprecated, use updateAll() instead');
      return this.updateAll(collectionName, idOrCriteria, data);
    }

    const collection = await this.getCollection(collectionName);
    return new Promise((resolve, reject) => {
      data._updated = Date.now();
      collection.update({ _uuid: idOrCriteria }, { $set: data }, { multi: false }, (err, res) => {
        if (err) {
          return reject(
            new ApplicationError('database_error', `Error updating ${collectionName}`, 'sys_mdb_update1', err)
          );
        }

        if (res.result.nModified === 1) {
          return resolve({ id: idOrCriteria });
        }

        if (res.result.nModified === 0) {
          return reject(new ApplicationError('not_found', `Object in ${collectionName} not found`, 'sys_mdb_update2'));
        }
      });
    });
  }

  private async _update(collectionName: string, idOrCriteria: string | any, data: any): Promise<any> {
    const criteria = typeof idOrCriteria === 'string' ? { _uuid: idOrCriteria } : idOrCriteria;
    const collection = await this.getCollection(collectionName);

    logger.debug(`Updating ${collectionName} with criteria: ${JSON.stringify(criteria)}`);

    return new Promise((resolve, reject) => {
      data._updated = Date.now();
      collection.update(criteria, { $set: data }, { multi: true }, (err, res) => {
        if (err) {
          return reject(
            new ApplicationError('database_error', `Error updating ${collectionName}`, 'sys_mdb_update1', err)
          );
        }

        logger.debug(`Updated: ${JSON.stringify(res)}`);

        if (typeof idOrCriteria === 'string') {
          if (res.result.nModified === 1) {
            return resolve({ id: idOrCriteria });
          }

          if (res.result.nModified === 0) {
            return reject(
              new ApplicationError('not_found', `Object in ${collectionName} not found`, 'sys_mdb_update2')
            );
          }
        }

        return resolve({
          found: res.result.n,
          modified: res.result.nModified,
          updated: res.result.ok,
        });
      });
    });
  }

  async removeAll(collectionName: string, criteria: any): Promise<any> {
    return this.updateAll(collectionName, criteria, { _deleted: true });
  }

  async remove(collectionName: string, id: string): Promise<any> {
    return this.get(collectionName, id).then(() => {
      return this.getCollection(collectionName).then((collection) => {
        return new Promise((resolve, reject) => {
          collection.updateMany({ _uuid: id }, { $set: { _deleted: true } }, (err) => {
            if (err) {
              return reject(
                new ApplicationError(
                  'database_error',
                  'Error removing object from collection',
                  'sys_mdb_remove_upd',
                  err
                )
              );
            }

            return resolve({ id: id });
          });
        });
      });
    });
  }

  async purge(collectionName: string, id: string): Promise<any> {
    return this.getCollection(collectionName).then((collection) => {
      return new Promise((resolve, reject) => {
        collection.findOne({ _uuid: id, _deleted: true }, {}, (foErr, item) => {
          if (foErr) {
            return new ApplicationError('database_error', 'Error looking up deleted item', 'sys_mdb_gcol_pg1', foErr);
          }

          if (!item) {
            return reject(
              new ApplicationError('database_error', 'Cannot purge item that is not deleted', 'sys_mdb_gcol_pg2', foErr)
            );
          }

          collection.remove({ _uuid: id }, { multi: true }, (err, data) => {
            if (err) {
              return reject(
                new ApplicationError('database_error', 'Error purging item with id: ' + id, 'sys_mdb_pg', err)
              );
            }

            return resolve({ id: id });
          });
        });
      });
    });
  }

  async restore(collectionName: string, criteria: any): Promise<any> {
    return this.getCollection(collectionName).then((collection) => {
      return new Promise((resolve, reject) => {
        criteria._deleted = true;
        collection.update(criteria, { $set: { _deleted: false } }, (err) => {
          if (err) {
            return reject(
              new ApplicationError('database_error', 'Error restoring a deleted item', 'sys_mdb_pres', err)
            );
          }
        });
      });
    });
  }

  async count(collectionName: string, criteria): Promise<any> {
    return this.getCollection(collectionName).then((collection) => {
      return new Promise((resolve, reject) => {
        collection.count(criteria, (err, cnt) => {
          if (err) {
            return reject(
              new ApplicationError('database_error', 'Error counting objects with given criteria', 'sys_mdb_cn', err)
            );
          }

          return resolve({ count: cnt });
        });
      });
    });
  }

  async drop(collectionName: string): Promise<any> {
    return this.getCollection(collectionName).then((collection) => {
      collection.drop();
      return Promise.resolve({ status: 'ok' });
    });
  }

  private static sanitiseCriteria(criteria) {
    const names = Object.getOwnPropertyNames(criteria);
    for (const name of names) {
      if (typeof criteria[name] !== 'string') {
        criteria[name] = MongoDBProtocol.sanitiseCriteria(criteria[name]);
      } else {
        if (name === '$exists') {
          criteria[name] = criteria[name] === 'true';
        }
      }
    }

    return criteria;
  }
}
