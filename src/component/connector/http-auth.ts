import { ApplicationError } from '../../error';
import { Engine } from '../..';

let logger;

export class HttpConnectorAuth {
  private _endpoint;
  private _authorization;

  constructor(private _engine: Engine, private _conf: any) {
    logger = _engine.log.log('engine:connector:http:auth');
    logger.debug(`Initializing auth with ${JSON.stringify(_conf)}`);
    this.init();
  }

  token() {
    if (this._authorization) {
      return `Bearer ${this._authorization.access_token}`;
    }

    return null;
  }

  private async init() {
    switch (this._conf.type) {
      case 'oauth':
        this._endpoint = this._engine.connector.connector(this._conf.endpoint);
        switch (this._conf.auth.grant_type) {
          case 'password':
            this.watch(async () => await this.authPassword());
            break;
        }
        break;
    }
  }

  private async watch(authoriser) {
    let sleep = 0;

    try {
      const tk = await authoriser();
      tk.ttl = Date.now() + tk.expires_in * 1000;
      this._authorization = tk;
      sleep = tk.expires_in - 60; // minute grace
      logger.debug(`Authorisation ${JSON.stringify(this._authorization, null, 2)}`);
    } catch (err) {
      logger.error(err);
    }

    this._engine.heartbeat.subscribe(
      'auth-watcher',
      10 /* seconds retry */,
      subId => {
        logger.debug(`Ding ding !!!! (${subId})`);
        authoriser()
          .then(token => {
            token.ttl = Date.now() + token.expires_in * 1000;
            this._authorization = token;
            logger.debug(`Authorisation ${JSON.stringify(this._authorization, null, 2)}`);
            this._engine.heartbeat.sleep(subId, token.expires_in - 60); // refresh token a minute before expiry
          })
          .catch(err => {
            logger.error(err);
          });
      } /* seleep for */,
      sleep
    );
  }

  private async authPassword() {
    return this._endpoint.post('/', this._conf.auth);
  }

  // refresh token auth
  private reAuth() {}
}
