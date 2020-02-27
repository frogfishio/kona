module.exports = (data: any) => {
  if (!data) {
    return data;
  }
  let res = {};
  for (const name of Object.getOwnPropertyNames(data)) {
    if (data[name]) {
      res[name] = data[name];
    }
  }
  return res;
};
