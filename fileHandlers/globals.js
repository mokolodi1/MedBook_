_.mapObject = function (obj, func) {
  var newObject = {};
  for (var index in obj) {
    newObject[index] = func(obj[index], index, obj);
  }
  return newObject;
};

validateNumberStrings = function (strings) {
  for (var index in strings) {
    var valueString = strings[index];
    if (isNaN(valueString)) {
      throw "Non-numerical expression value: " + valueString;
    }
  }
};

errorResultResolver = function (deferred) {
  return function (error, result) {
    if (error) {
      deferred.reject(error);
    } else {
      deferred.resolve({});
    }
  };
};
