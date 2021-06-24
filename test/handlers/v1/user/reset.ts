let logger;

export default class UserPasswordResetHandler {
  private api;

  constructor(private engine, private user) {
    logger = engine.log.log('service:user:reset');
    this.api = this.engine.user;
  }

  async post(req, res, params, callback) {
    try {
      res.json(await this.api.requestPasswordReset(req.body.email));
    } catch (err) {
      err.send(res);
    }
  }

  async put(req, res) {
    try {
      res.json(await this.api.updatePasswordByResetCode(req.path.split('/')[4], req.body.password));
    } catch (err) {
      require('@frogfish/kona/util').error(err, res, logger, 'svc_user_reset_put');
    }
  }
}
