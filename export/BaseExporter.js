function niceWrite (writeStream, toWrite) {
  var keepWriting = writeStream.write(toWrite);
  if (keepWriting) {
    // return a promise that has already been resolved
    // any .then()s connected to this will fire immidiately
    return Q();
  }

  // waits until the stream has drained, then resolves
  return new Q.Promise(function (resolve) {
    writeStream.once("drain", resolve);
  });
}

BaseExporter = function (destination, options) {
  var self = this;

  self.init.call(self, options);

  var deferred = Q.defer();

  self.writeStream = createWriteStream(destination);
  var lineNumber = 1; // starts at 1

  function writeNextLine () {
    var chunks = [];
    self.getLine.call(self, function (chunk) {
      chunks.push(chunk);
    }, lineNumber);

    if (chunks.length) {
      lineNumber++;
      // write all chunks, wait for drain (if necessary), call itself
      niceWrite(self.writeStream, chunks.join("") + "\n")
        .then(writeNextLine);
    } else {
      // end the write stream, close the file
      self.writeStream.end(deferred.resolve);
    }
  }
  writeNextLine(); // kick off the writing

  return deferred.promise;
};

BaseExporter.prototype = {};
BaseExporter.prototype.init = function (write, lineNumber) {
  throw new Error("init not overridden");
};

BaseExporter.prototype.getLine = function (write, lineNumber) {
  throw new Error("getLine not overridden");
};
