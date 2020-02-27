import { ApplicationError } from '../error';

module.exports.get = async (url: string, query: any) => {
  return new Promise((resolve, reject) => {
    const request = require('request');
    request.get(
      {
        url: url,
        qs: query,
        json: true
      },
      (err, httpResponse, body) => {
        if (httpResponse.statusCode !== 200) {
          return reject(new ApplicationError(body.error, body.error_description, `remote_${body.trace}`));
        }
        return resolve(body);
      }
    );
  });
};

module.exports.post = async (url: string, form: any) => {
  return new Promise((resolve, reject) => {
    const request = require('request');
    request.post(
      {
        url: url,
        form: form,
        json: true
      },
      (err, httpResponse, body) => {
        if (httpResponse.statusCode !== 200) {
          return reject(new ApplicationError(body.error, body.error_description, `remote_${body.trace}`));
        }
        return resolve(body);
      }
    );
  });
};

module.exports.put = async (url: string, form: any) => {
  return new Promise((resolve, reject) => {
    const request = require('request');
    request.put(
      {
        url: url,
        form: form,
        json: true
      },
      (err, httpResponse, body) => {
        if (httpResponse.statusCode !== 200) {
          return reject(new ApplicationError(body.error, body.error_description, `remote_${body.trace}`));
        }
        return resolve(body);
      }
    );
  });
};

module.exports.del = async (url: string, query: any) => {
  return new Promise((resolve, reject) => {
    const request = require('request');
    request.del(
      {
        url: url,
        qs: query,
        json: true
      },
      (err, httpResponse, body) => {
        if (httpResponse.statusCode !== 200) {
          return reject(new ApplicationError(body.error, body.error_description, `remote_${body.trace}`));
        }
        return resolve(body);
      }
    );
  });
};

function sanitize(error: any) {
  return error.error;
}
