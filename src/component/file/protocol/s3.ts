import { Engine } from '../../..';
import { ApplicationError } from '../../../error';
import { Counter } from './counter';
import { ReadStream } from 'fs';

let logger;

const {
  S3Client,
  ManagedUpload,
  ListBucketsCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');
import { Upload } from '@aws-sdk/lib-storage';

export class S3Protocol {
  private S3;

  constructor(private system: Engine, private conf) {
    logger = system.log.log('engine:file:s3');
  }

  async init(): Promise<any> {
    return new Promise((resolve, reject) => {
      logger.info('Initialising S3 File Protocol');

      this.S3 = new S3Client({
        region: 'auto',
        endpoint: this.conf.endpoint,
        credentials: {
          accessKeyId: this.conf.key,
          secretAccessKey: this.conf.secret,
        },
      });
      return resolve(null);
    });
  }

  async create(file): Promise<any> {
    const uuid = require('uuid').v4();
    let counter = new Counter();
    let data = file.pipe(counter);
    const params = { Bucket: this.conf.store, Key: uuid, Body: data };
    // options: { partSize: 20 * 1024 * 1024, queueSize: 10 },

    const upload = new Upload({
      client: this.S3,
      // tags: [...], // optional tags
      // queueSize: 4, // optional concurrency configuration
      // leavePartsOnError: false, // optional manually handle dropped parts
      params: params,
    });

    try {
      await upload.done();
      return {
        id: uuid,
        mime: counter.mime,
        length: counter.count,
        digest: counter.shasum.digest('hex'),
      };
    } catch (err) {
      throw new ApplicationError('system_error', 'Error uploading payload to S3 - ' + err, 's3_sa_1');
    }
  }

  async remove(fileId: string): Promise<any> {
    const params = { Bucket: this.conf.store, Key: fileId };
    try {
      return this.S3.send(new DeleteObjectCommand(params));
    } catch (err) {
      throw new ApplicationError(
        'system_error',
        `Error deleting S3 object ${params.Bucket}/${params.Key} : ` + err,
        's3_sa_rm'
      );
    }
  }

  async get(fileId: string): Promise<ReadStream> {
    const params = { Bucket: this.conf.store, Key: fileId };

    try {
      return await this.S3.send(new GetObjectCommand(params));
      //https://stackoverflow.com/questions/67366381/aws-s3-v3-javascript-sdk-stream-file-from-bucket-getobjectcommand
    } catch (err) {
      if (err.code === 'NoSuchKey') {
        throw new ApplicationError('not_found', 'File not found', 's3_re_g', err);
      }

      throw new ApplicationError('system_error', 'Error reading from connector', 's3_re_1', new Error(err.message));
    }
  }
}
