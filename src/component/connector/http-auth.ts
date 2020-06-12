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
    // if (!this._token) {
    //   this._token = await waiter();
    //   logger.debug(`-----------result----------\n${JSON.stringify(this._token, null, 2)}`);
    // }

    this._engine.heartbeat.subscribe('auth-watcher', 5, subId => {
      logger.debug(`Ding ding !!!! (${subId})`);
      authoriser()
        .then(token => {
          token.ttl = Date.now() + token.expires_in * 1000;
          this._authorization = token;
          logger.debug(`Authorisation ${JSON.stringify(this._authorization, null, 2)}`);
        })
        .catch(err => {
          logger.error(err);
        });
    });
  }

  private async authPassword() {
    return this._endpoint.post('/', this._conf.auth);
  }

  // refresh token auth
  private reAuth() {}
}
