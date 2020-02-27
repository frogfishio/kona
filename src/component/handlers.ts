import { Engine } from '..';

let logger;

export class Handlers {
  private conf;
  private handlers = [];

  constructor(private system: Engine) {
    logger = system.log.log('engine:handlers');
  }

  init(): Promise<any> {
    return new Promise((resolve, reject) => {
      logger.info('Initialising handlers');
      const root = this.system.configuration.get('system').root;
      this.handlers = this.system.configuration.get('handlers') || [];

      for (const handler of this.conf.handlers) {
        this.handlers.push(root + handler);
        logger.info(`Registering handler ${root + handler}`);
      }

      return resolve(this);
    });
  }
}
