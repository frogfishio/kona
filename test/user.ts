import { Engine } from '../src/index';

let engine: Engine;

const chai = require('chai');
const expect = chai.expect;
const time = Date.now();

let userId;
let roleId;

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

  it('should create a role', async () =>
    console.log(
      'Created role id -> ' +
        (roleId = (await engine.role.create({ name: 'role_' + time, permissions: ['one', 'two', 'three'] })).id)
    ));

  it('should add scoped role for user', async () =>
    expect(await engine.user.addRoleToUser(userId, roleId, 'test_scope'))
      .to.have.property('id')
      .which.equals(userId));

  it('should return', async () => {
    const result = await engine.user.getUserPermissions(userId);
    console.log(`resutls ------> ${JSON.stringify(result, null, 2)}`);
    expect(result).to.have.property('test_scope');
  });

  it('should login', async () => {
    const result = await engine.auth.authenticate({
      grant_type: 'password',
      email: 'u' + time + '@mailinator.com',
      password: 'secret',
    });
    console.log(`resutls ------> ${JSON.stringify(result, null, 2)}`);
    expect(result).to.have.property('access_token');
  });

  it('should create user with email alone');
});
