import { Engine } from '../../..';
import { ApplicationError } from '../../../error';
import { Email, EmailMessage } from '../../email';

let logger;

export class EmailHandler {
  private users;
  private template;
  private email;

  constructor(private engine: Engine, private conf) {
    logger = engine.log.log('email-handler');
    this.users = this.engine.user;
    this.template = this.engine.template;
    this.email = this.engine.email;
  }

  handle(params?: any): Promise<any> {
    logger.debug(`Handling: ${JSON.stringify(params)} with ${JSON.stringify(this.conf)}`);
    let message: EmailMessage;
    let data;

    return this.prepare(params)
      .then(preparedData => {
        data = preparedData;
        logger.debug('Using data: ' + JSON.stringify(data));
        message = {
          from: EmailHandler.build(this.conf.from, data),
          to: data.user.email,
          subject: EmailHandler.build(this.conf.subject, data)
        };
        return Promise.resolve();
      })
      .then(() => {
        if (this.conf.templates.text) {
          return this.template.render(this.conf.templates.text, data).then(renderedText => {
            message.text = renderedText;
          });
        }
      })
      .then(() => {
        if (this.conf.templates.html) {
          return this.template.render(this.conf.templates.html, data).then(renderedHtml => {
            message.html = renderedHtml;
          });
        }
      })
      .then(() => {
        logger.debug(`Will be sending message: ${JSON.stringify(message, null, 2)}`);
        return this.email.send(message);
      });
  }

  private prepare(data): Promise<any> {
    if (!data || !data.user) {
      return Promise.resolve(data);
    }

    return this.users.get(data.user).then(user => {
      data.user = user;
      return Promise.resolve(data);
    });
  }

  private static build(text: string, data?: any): string {
    if (text.indexOf('{') === -1 || !data) {
      return text;
    }

    const Handlebars = require('handlebars');
    var template = Handlebars.compile(text)
    return template(data);
  }
}
