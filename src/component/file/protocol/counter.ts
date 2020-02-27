import { Stream, PassThrough } from 'stream';

export class Counter extends Stream.Transform {
  shasum;
  count = 0;
  mime;

  private typebuff = [];

  constructor() {
    super();
    let crypto = require('crypto');
    this.shasum = crypto.createHash('sha1');
  }

  _transform(chunk: any, encoding: string, callback: Function): void {
    this.count += chunk.length;
    this.shasum.update(chunk);
    if (this.typebuff.length < 4100) {
      this.typebuff = this.typebuff.concat(chunk);
      if (this.typebuff.length >= 4100) {
        const ft = require('file-type');
        this.mime = ft(this.typebuff).mime;
      }
    }
    callback(null, chunk);
  }
}
