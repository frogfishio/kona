let logger;

export default class UserVerifyHandler {
  private api;

  constructor(private engine, private user) {
    logger = engine.log.log('service:user:verify');
    this.api = this.engine.user;
  }

  async put(req, res, params, callback) {
    try {
      return res.json(await this.api.verify(req.body.code));
    } catch (err) {
      require('@frogfish/kona/util').error(err, res, logger, 'svc_user_verify_put');
    }
  }
}
