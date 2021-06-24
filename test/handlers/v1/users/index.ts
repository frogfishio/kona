import { Engine } from "../../../index";

let logger;

export default class UsersService {
  constructor(private engine: Engine, private user) {
    logger = engine.log.log('service:users');
  }

  async get(req, res, params, callback) {
    const criteria = req.query;
    const split = req.path.split('/');
    let context = split[3];
    let skip = split[4];
    let limit = split[5];

    // Sanitise parameters (optional context)
    if (Number.isInteger(context)) {
      limit = skip;
      skip = context;
      context = null;
    }

    skip = skip ? parseInt(skip) : null;
    limit = limit ? parseInt(limit) : null;

    try {
      if (!context) {
        const permissions = await this.engine.user.getUserPermissions(this.user.id);
      }
      const result = await this.engine.user.find(criteria, skip, limit);
      return res.json(result);
    } catch (err) {
      require('@frogfish/kona/util').error(err, res, logger, 'svc_users_get');
    }
  }
}
