import { Engine } from '../src/index';

let engine: Engine;

const chai = require('chai');
const expect = chai.expect;
const time = Date.now();

let userId;

describe('User', () => {
  beforeEach(async () => {
    engine = await require('./engine')();
  });

  it('should create user with email and password', async () =>
    console.log(
      'Created user id -> ' +
        (userId = (await engine.user.create({ email: 'u' + time + '@mailinator.com', password: 'secret' })).id)
    ));

  it('should return', async () =>
    expect(await engine.user.get(userId))
      .to.have.property('email')
      .which.equals('u' + time + '@mailinator.com'));

  it('should create user with email alone');

  // it('should return', async () =>
  //   expect(await engine.role.get(roleId))
  //     .to.have.property('name')
  //     .which.equals('role_' + time));
});
