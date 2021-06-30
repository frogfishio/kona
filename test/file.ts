import { Engine } from '../src';

const fs = require('fs');
const chai = require('chai');
chai.use(require('chai-like'));
chai.use(require('chai-things'));
const expect = chai.expect;
const TIME = Date.now();

let engine: Engine;
let adminToken;
let testFile;

describe('File', () => {
  beforeEach(async () => {
    engine = await require('./helper').engine();

    adminToken =
      adminToken ||
      (
        await engine.auth.authenticate({
          grant_type: 'password',
          email: `test@test.test`,
          password: `testtest`,
        })
      ).access_token;
  });

  it('should get list of files as a ping');
  it('should upload file', async () => {
    const rs = fs.createReadStream('/home/eldiablo/Work/Kona/core/kona/test/test.jpg');
    testFile = await engine.files.create(`test_file_${TIME}.jpg`, rs, null, { hello: 'world' });
    // console.log(JSON.stringify(res));
    expect(testFile).to.have.property('name').which.equals(`test_file_${TIME}.jpg`);
  });

  it('should get file', async () => {
    expect(await engine.files.get(testFile.id))
      .to.have.property('_uuid')
      .which.equals(testFile.id);
  });

  it('should find file by ID', async () => {
    expect(await engine.files.find({ _uuid: testFile.id }))
      .to.be.instanceof(Array)
      .with.length(1);
  });

  it('should get file payload', async () => {
    const fs = require('fs');
    const crypto = require('crypto');
    const shasum = crypto.createHash('sha1');

    const pass = await engine.files.payload(testFile.id);
    pass.on('data', (chunk) => {
      shasum.update(chunk);
    });

    pass.on('end', () => {
      const digest = shasum.digest('hex');
      console.log('SHA ------> ' + digest);
      expect(digest).to.equals(testFile.digest);
    });
  });

  it('should delete file', async () => {
    expect(await engine.files.remove(testFile.id)).to.have.property('id');
  });
  it('should fail finding the deleted file');
});
