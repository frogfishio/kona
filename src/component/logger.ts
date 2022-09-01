const TRACE_MAX_COUNT = 20;

export class Logger {
  private _logger;
  private contexts = {};
  private _trace: Array<string> = [];

  get logger() {
    return this._logger;
  }

  set trace(value: string) {
    this._trace.push(value);
    if (this._trace.length > TRACE_MAX_COUNT) {
      this._trace.shift();
    }
  }

  get trace() {
    let ret = '';
    for (const line of this._trace) {
      ret += `${line}\n`;
    }
    return ret;
  }

  constructor(private conf) {
    // let colorize = true;
    // if (conf.live === true) {
    //   colorize = false;
    // }
    // const winston = require('winston');
    // // tslint:disable-next-line:no-unused-expression
    // require('winston-papertrail').Papertrail;
    // winston.setLevels({
    //   debug: 7,
    //   info: 6,
    //   warn: 4,
    //   error: 3,
    //   emergency: 0,
    // });
    // winston.addColors({
    //   debug: 'cyan',
    //   info: 'green',
    //   warn: 'yellow',
    //   error: 'red',
    //   emergency: 'magenta',
    // });
    // winston.remove(winston.transports.Console);
    // winston.add(winston.transports.Console, {
    //   colorize: colorize,
    //   stderrLevels: ['error', 'fatal'],
    // });
    // winston.level = this.conf.log ? this.conf.log.level || 'info' : 'info';
    // winston.info('Logging starting in ' + (this.conf.log.level || 'info') + ' mode');
    // if (this.conf.log) {
    //   if (this.conf.log.file) {
    //     winston.add(winston.transports.File, {
    //       filename: this.conf.log.file, //|| '/var/log/engine.log',
    //       timestamp: true,
    //       maxsize: 1000000,
    //     });
    //     winston.info('Logs will be written to ' + (this.conf.log.file || '/var/log/engine.log'));
    //   }
    //   if (this.conf.log.host && this.conf.log.port) {
    //     winston.add(winston.transports.Papertrail, {
    //       host: this.conf.log.host,
    //       port: this.conf.log.port,
    //       program: conf.name || this.conf.id,
    //     });
    //     winston.info(`Remote logging enabled to ${this.conf.log.host}:${this.conf.log.port}`);
    //   }
    // }
    // this._logger = winston;
  }

  log(context) {
    return new Log(context || 'global', this.conf);
  }
}

class Log {
  private _debug;

  constructor(private context: string, private conf: any) {
    this.conf = conf || {};
    this.conf.component = context;
    this.context = context.toLowerCase();
    this._debug = require('debug')(this.context);
  }

  debug(message) {
    const msg = this.contextify(
      message.error_description ? message.error_description + ' (' + message.trace + ')' : message
    );
    this._debug(msg);
  }
  info(message) {
    const msg = this.contextify(
      message.error_description ? message.error_description + ' (' + message.trace + ')' : message
    );
    this._debug(msg);
  }
  warn(message) {
    const msg = this.contextify(
      message.error_description ? message.error_description + ' (' + message.trace + ')' : message
    );

    this._debug(msg);
  }
  error(message) {
    this._debug(
      `********** ERROR ***********\n${
        message.error_description ? this.contextify(`${JSON.stringify(message, null, 2)} ${message.stack}`) : message
      }\n${message.stack ? message.stack + '\n' : ''}********** ERROR END *********`
    );
  }
  emergency(message) {
    this._debug(
      `********** EMERGENCY ***********\n${
        message.error ? this.contextify(`${JSON.stringify(message, null, 2)}`) : message
      }\n${message.stack ? message.stack + '\n' : ''}`
    );

    this.debug(new Error().stack);
    this.debug('********** EMERGENCY END *********');
  }

  // info: <engine> environment:prod tenant:lovecroatia module:api component:responder @tag:coolapp Message
  // for actions use #view <uuid of related object> [then contex/action related values]
  private contextify(text: string) {
    let msg = this.conf.live ? '+ ' : '';
    msg += this.conf.env ? this.conf.env : '';
    msg += this.conf.tenant ? ` ${this.conf.tenant}` : '';
    msg += this.conf.app ? ` ${this.conf.app}` : '';
    msg += this.conf.tag ? ` @${this.conf.tag}` : '';
    msg += msg.length > 0 ? ' ' : '';
    msg += `[${this.context}] ${text}`;
    return msg;
  }
}
