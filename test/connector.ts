// import { Engine } from '../src';

// let logger;
// const chai = require('chai');
// const should = chai.should();
// const expect = chai.expect;

// describe('Role service', function () {
//   let engine;

//   beforeEach(async () => {
//     engine = await require('./helper').engine();
//   });

//   describe('Connector', () => {
//     it('should wait for a bit', done => {
//       setTimeout(() => {
//         done();
//       }, 500);
//     });

//     it('should return data', async () => {
//       const conn = engine.connector.connector('scarlet');
//       const result = await conn.get('/content/find');
//       console.log(
//         `*********************************************************\n${JSON.stringify(
//           result
//         )}\n*********************************************************`
//       );
//     });
//   });
// });
