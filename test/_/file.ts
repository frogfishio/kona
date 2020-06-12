// import { Engine } from '../src/index';

// let engine: Engine;

// const fs = require('fs');
// const chai = require('chai');
// const expect = chai.expect;
// const time = Date.now();

// let fileId;

// describe('File', () => {
//   beforeEach(async () => {
//     engine = await require('./engine')();
//   });

//   it('should create file', async () =>
//     console.log(
//       'Created file id -> ' +
//         (fileId = (
//           await engine.files.create('test.jpg', fs.createReadStream(`${process.env.ENGINE_ROOT}/test/test.jpg`))
//         ).id)
//     ));

//   it('should return file', async () =>
//     expect(await engine.files.get(fileId))
//       .to.have.property('name')
//       .which.equals('test.jpg'));

//   // it('should return payload', done => {
//   //   engine.files.payload(fileId).then(stream => {
//   //     const out = fs.createWriteStream(`${process.env.ENGINE_ROOT}/test/res.jpg`);
//   //     stream.pipe(out);
//   //   });
//   // });
// });
