// import { Engine } from '../src/index';

// let engine: Engine; // = global['engine'];

// const chai = require('chai');
// const should = chai.should();
// const expect = chai.expect;

// describe('Auth', () => {
//   const time = Date.now();

//   beforeEach(async () => {
//     engine = await require('./engine')();
//   });

//   it('should return web page', async () => {
//     await engine.connectors.connector('http-connector').get('/', null, null, true);
//   });

//   it('should return cached web page', async () => {
//     await engine.connectors.connector('http-connector').get('/get');
//   });

//   it('should return post data', async () => {
//     await engine.connectors.connector('http-connector').post('/post', JSON.stringify({ hello: 'world' }), null, true);
//   });

//   it('SOAP', async () => {
//     await engine.connectors.connector('soap-connector');
//   });
// });
