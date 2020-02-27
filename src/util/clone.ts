module.exports.cloneSelective = (source, exclude, merge) => {
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
