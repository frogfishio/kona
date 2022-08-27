// import { Engine } from '../../..';
// import { ApplicationError } from '../../../error';
// import { Counter } from './counter';
// import { ReadStream } from 'fs';

// let logger;

// export class S3Protocol {
//   private aws;

//   constructor(private system: Engine, private conf) {
//     logger = system.log.log('engine:file:s3');
//   }

//   async init(): Promise<any> {
//     return new Promise((resolve, reject) => {
//       logger.info('Initialising S3 File Protocol');
//       this.aws = require('aws-sdk');
//       this.aws.config = {
//         accessKeyId: this.conf.key,
//         secretAccessKey: this.conf.secret,
//       };
//       return resolve(null);
//     });
//   }

//   async create(file): Promise<any> {
//     return new Promise((resolve, reject) => {
//       const fs = require('fs');
//       const uuid = require('uuid').v4();

//       let counter = new Counter();
//       let data = file.pipe(counter);

//       let s3 = new this.aws.S3({
//         params: { Bucket: this.conf.store, Key: uuid, Body: data },
//         options: { partSize: 20 * 1024 * 1024, queueSize: 10 },
//       });
//       s3.upload().send(function (err, data) {
//         if (err) {
//           return reject(new ApplicationError('system_error', 'Error uploading payload to S3 - ' + err, 's3_sa_1'));
//         }

//         // console.log(`zzzz Upload of ' + uuid + ' to S3 finished, stats = ${JSON.stringify(counter,null,2)}`);
//         return resolve({
//           id: uuid,
//           mime: counter.mime,
//           length: counter.count,
//           digest: counter.shasum.digest('hex'),
//         });
//       });
//     });
//   }

//   async remove(fileId: string): Promise<any> {
//     const params = { Bucket: this.conf.store, Key: fileId };
//     const s3 = new this.aws.S3();
//     return s3.deleteObject(params).promise();
//   }

//   async get(fileId: string): Promise<ReadStream> {
//     return new Promise<ReadStream>((resolve, reject) => {
//       let params = { Bucket: this.conf.store, Key: fileId };

//       const s3 = new this.aws.S3();
//       s3.getObject(params, function (err, obj) {
//         if (err) {
//           if (err.code === 'NoSuchKey') {
//             return reject(new ApplicationError('not_found', 'File not found', 's3_re_g', err));
//           }

//           return reject(
//             new ApplicationError('system_error', 'Error reading from connector', 's3_re_1', new Error(err.message))
//           );
//         }

//         const stream = require('stream');
//         let rs = new stream.PassThrough();
//         rs.end(Buffer.from(obj.Body));

//         return resolve(rs);
//       });
//     });
//   }
// }
