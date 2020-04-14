module.exports = (data: any) => {
  if (!data) {
    return data;
  }
  let res = {};
  for (const name of Object.getOwnPropertyNames(data)) {
    if (data[name] || data[name] === false || data[name] === 0) {
      res[name] = data[name];
    }
  }
  return res;
};
