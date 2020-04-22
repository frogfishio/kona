module.exports.toBolean = (data): boolean => {
  if (data === true || data === false) {
    return data;
  }

  if (!data) {
    return null;
  }

  if (('' + data).trim().toLowerCase() === 'true') {
    return true;
  }

  return false;
};

module.exports.merge = (dest: any, source: any) => {
  for (const name of Object.getOwnPropertyNames(source)) {
    if (!dest[name] || typeof dest[name] !== 'object') {
      dest[name] = source[name];
    } else {
      dest[name] = merge(dest[name], source[name]);
    }
  }

  return dest;
};

module.exports.strip = (data: any) => {
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

module.exports.clone = (source, exclude?, merge?) => {
  const clone = {};
  let excludeList = exclude || [];
  if (!Array.isArray(excludeList)) {
    excludeList = [excludeList];
  }

  let names = Object.getOwnPropertyNames(source);

  for (let i = 0; i < names.length; i++) {
    if (excludeList.indexOf(names[i]) === -1 && names[i].charAt(0) !== '$') {
      clone[names[i]] = source[names[i]];
    }
  }

  if (merge) {
    names = Object.getOwnPropertyNames(merge);
    for (let i = 0; i < names.length; i++) {
      clone[names[i]] = merge[names[i]];
    }
  }

  return clone;
};
