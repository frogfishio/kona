import { Engine } from '../../..';
import { ApplicationError } from '../../../error';

let logger;

export class MailgunProvider {
  private mailgun;
  constructor(private system: Engine, private conf) {
    logger = system.log.log('engine:mail:mailgun');
    this.mailgun = require('mailgun-js')({ apiKey: this.conf.key, domain: this.conf.domain });
  }

  send(message): Promise<any> {
    return new Promise((resolve, reject) => {
      logger.debug(`Mailgun sending to ${message.to}`);

      this.mailgun.messages().send(message, (err, body) => {
        // console.log('ERR: >>>>>> ' + err);
        // console.log('RESULT: >>>>>> ' + body);
        if (err) {
          return reject(new ApplicationError('system_error', `Error sending message ${err}`, 'com_email_se1'));
        }
        return resolve(null);
      });
    });
  }
}
