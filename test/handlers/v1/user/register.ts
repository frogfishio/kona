let logger;

export default class UserRegisterHandler {
  private userAPI;
  private authAPI;

  constructor(private engine, private user) {
    logger = engine.log.log('service:user:register');
    this.userAPI = this.engine.user;
    this.authAPI = this.engine.auth;
  }

  async post(req, res, next) {
    try {
      logger.debug(`Creating user: ${JSON.stringify(req.body, null, 2)}`);
      await this.userAPI.create(req.body);

      logger.debug(`Logging in the newly created user`);
      const token = await this.authAPI.authenticate({
        grant_type: 'password',
        email: req.body.email,
        password: req.body.password,
      });

      return res.json(token);
    } catch (err) {
      require('@frogfish/kona/util').error(err, res, logger, 'svc_user_register_post');
    }
  }
}
