import { Engine } from '../../../index';
import { BaseHandler } from '../../base';

let logger;
const ADMIN_ROLE = 'user_admin';

export default class UserHander extends BaseHandler {
  constructor(engine: Engine, user) {
    super(engine, user);
    logger = engine.log.log('service:user');
  }

  async get(req, res, next) {
    const split = req.path.split('/');
    const userId = split[3];

    try {
      res.json(await this.engine.user.get(userId));
    } catch (err) {
      require('@frogfish/kona/util').error(err, res, logger, 'svc_user_get');
    }
  }

  async post(req, res, next) {
    const accountData = { name: req.body.account_name };
    const options: any = {};

    try {
      res.json(await this.engine.user.create(req.body, accountData, options));
    } catch (err) {
      require('@frogfish/kona/util').error(err, res, logger, 'svc_user_post');
    }
  }

  async put(req, res, next) {
    const userId = req.path.split('/')[3];

    try {
      res.json(await this.engine.user.update(userId, req.body));
    } catch (err) {
      require('@frogfish/kona/util').error(err, res, logger, 'svc_user_put');
    }
  }

  async delete(req, res, next) {
    const userId = req.path.split('/')[3];

    try {
      res.json(await this.engine.user.remove(userId));
    } catch (err) {
      require('@frogfish/kona/util').error(err, res, logger, 'svc_user_del');
    }
  }
}
