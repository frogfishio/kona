import { ApplicationError } from '../../error';
import { Engine } from '../..';

let logger;

export class HttpConnector {
  private _request = require('request');
  private _reveal = require('../../util/reveal');

  constructor(private _engine: Engine, private _conf: any) {
    logger = _engine.log.log('engine:connector:http');
    logger.debug(`HTTP connector with URL ${this._conf.url} created`);
  }

  async get(verb: string, query?: any, headers?: any, force?: boolean): Promise<any> {
    let data;
    if (force !== true && this._engine.cache) {
      data = await this._engine.cache.get('_http_connector', verb);
      if (data) {
        logger.debug('Got cached HTTP request result');
      }
    }

    if (!data) {
      data = await this.request('get', verb, query, headers);

      if (this._conf.cache) {
        logger.debug('Caching HTTP request result');
        this._engine.cache.set('_http_connector', verb, data, this._conf.cache.ttl);
      }
    }

    return data;
  }

  async post(verb: string, data: any, headers?: any, raw?: boolean): Promise<any> {
    return this.request('post', verb, data, headers, raw);
  }
  async put(verb: string, data: any, headers?: any, raw?: boolean): Promise<any> {
    return this.request('put', verb, data, headers, raw);
  }
  async patch(verb: string, data: any, headers?: any, raw?: boolean): Promise<any> {
    return this.request('patch', verb, data, headers, raw);
  }
  async del(verb: string, query?: any, headers?: any): Promise<any> {
    return this.request('delete', verb, query, headers);
  }

  private async request(method: string, verb, data?: any, headers?: any, raw?: boolean): Promise<any> {
    method = method.toUpperCase();

    let req = this.inflate(this._conf, method, verb, data, headers, raw);

    if (this._conf.agent) {
      switch (this._conf.agent.type) {
        case 'https_over_http_tunnel':
          logger.debug('Usig HTTPS over HTTP tunnel');
          const tunnel = require('tunnel');
          req.agent = tunnel.httpsOverHttp(this.inflate(this._conf.agent, null, null, data, headers, raw));
          break;
      }
    }

    const clone = JSON.parse(JSON.stringify(req));
    delete clone.pfx;
    logger.debug(JSON.stringify(clone, null, 2));

    return new Promise((resolve, reject) => {
      this._request(req, (err, response, body) => {
        try {
          if (err) {
            logger.debug(err);
            logger.debug(body);
            logger.debug(response);
            return reject(new ApplicationError('invalid_request', JSON.stringify(err), 'sys_conn_http_req1'));
          }

          if (response.statusCode !== 200) {
            return reject(new ApplicationError('invalid_request', JSON.stringify(body), 'sys_conn_http_req2'));
          }

          if (response.statusCode === 200) {
            return resolve(this.materialize(body));
          }
        } catch (err) {
          return reject(err);
        }
        return resolve(body);
      });
    });
  }

  private inflate(conf: any, method: string, verb: string, data?: any, headers?: any, raw?: boolean) {
    const req: any = {};
    req.method = method ? method : undefined;
    req.uri = verb ? conf.url + verb : undefined;
    conf = JSON.parse(JSON.stringify(conf));

    if (conf.headers || headers) {
      req.headers = require('../../util/merge')(conf.headers || {}, headers || {});
    }

    if (conf.data || data) {
      if (method === 'GET' || method === 'DELETE') {
        req.qs = require('../../util/merge')(conf.data || {}, data || {});
      } else {
        if (raw) {
          req.body = data || conf.data;
        } else {
          req.form = require('../../util/merge')(conf.data || {}, data || {});
        }
      }
    }

    if (conf.query) {
      req.qs = require('../../util/merge')(conf.query || {}, req.qs || {});
    }

    if (conf.pfx) {
      req.pfx = this._reveal(conf.pfx);
    }

    if (conf.passphrase) {
      req.passphrase = this._reveal(conf.passphrase);
    }

    if (conf.proxy) {
      req.proxy = {
        host: this._reveal(conf.proxy.host),
        port: this._reveal(conf.proxy.port),
        proxyAuth: this._reveal(conf.proxy.auth)
      };
    }

    return req;
  }

  private materialize(data: string): any {
    switch (this._conf.mime) {
      case 'application/json':
        try {
          return JSON.parse(data);
        } catch (err) {
          throw new ApplicationError('invalid_request', 'Expected JSON returned invalid format', 'sys_conn_http_json');
        }
      default:
        return data;
    }
  }
}

export default function(engine: Engine, conf) {
  return new HttpConnector(engine, conf);
}
