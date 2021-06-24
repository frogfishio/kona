let logger;

export default class UserPreferencesHandler {
  private api;

  constructor(private engine, private user) {
    logger = engine.log.log('service:user:preferences');
    this.api = this.engine.user;
  }

  put(req, res, params, callback) {
    const split = req.path.split('/');
    const userId = split[3];

    require('@frogfish/kona/util/authorize')(this.user, 'write_users')
      .then(() => {
        return this.api.updatePreferences(userId, req.body);
      })
      .then((result) => {
        return res.json(result);
      })
      .catch((err) => {
        if (err && err.error === 'insufficient_scope' && this.user.id === userId) {
          return this.api.updatePreferences(userId, req.body);
        }

        return Promise.reject(err);
      })
      .then((result) => {
        return res.json(result);
      })
      .catch((err) => {
        return err.send(res);
      });
  }
}
