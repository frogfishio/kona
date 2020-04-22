const agent = require('superagent');

module.exports.post = async function (url: string, data: any, token?: string): Promise<any> {
  return req('POST', url, data, token, true);
};

module.exports.put = async function (url: string, data: any, token?: string): Promise<any> {
  return req('PUT', url, data, token, true);
};

module.exports.patch = async function (url: string, data: any, token?: string): Promise<any> {
  return req('PATCH', url, data, token, true);
};

module.exports.get = async function (url: string, query: any, token?: string): Promise<any> {
  return req('GET', url, query, token, true);
};

module.exports.del = async function (url: string, query: any, token?: string): Promise<any> {
  return req('DELETE', url, query, token, true);
};

async function req(method: string, url: string, data?: any, token?: string, raw?: boolean): Promise<any> {
  method = method.toUpperCase();

  const rq: any = {
    method: method,
    uri: url,
    json: true,
  };

  if (data) {
    if (method === 'GET' || method === 'DELETE') {
      rq.qs = data;
    } else {
      if (raw) {
        rq.body = data;
      } else {
        rq.form = data;
      }
    }
  }

  if (token) {
    rq.headers = { Authorization: `Bearer ${token}` };
  }

  let params: any = {};
  if (token) {
    params['Authorization'] = `Bearer ${token}`;
  }

  if (!raw) {
    params['accept'] = 'json';
  }

  let req;

  return new Promise((resolve, reject) => {
    switch (method) {
      case 'GET':
        req = agent.get(url).query(data);
        break;
      case 'DELETE':
        req = agent.del(url).query(data);
        break;
      case 'POST':
        req = agent.post(url).send(data);
        break;
      case 'PUT':
        req = agent.put(url).send(data);
        break;
      case 'PATCH':
        req = agent.patch(url).send(data);
        break;
    }

    req.set(params);
    req
      .then((result) => {
        if (result.status === 200) {
          if (raw) {
            return resolve(JSON.parse(result.text));
          }
          return resolve(result.text);
        }
      })
      .catch((err) => {
        if (raw) {
          return reject(JSON.parse(err.response.text));
        }
        return reject(err.response.text);
      });
  });
}
