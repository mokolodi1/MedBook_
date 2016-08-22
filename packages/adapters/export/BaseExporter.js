BaseExporter = function () {};

BaseExporter.prototype = {};

function niceWrite (writeStream, toWrite) {
  // NOTE: might need to break toWrite into multiple strings
  if (toWrite.length > 10000) {
    console.log("break toWrite into multiple strings");
  }
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

BaseExporter.prototype.run = function (destination, options) {
  var self = this;

  return new Q.Promise(function (resolve, reject) {
    // make sure it's being called with new keyword
    if (!self.init) {
      console.log("not called with new keyword");
      throw new Error("not called with new keyword");
    }

    self.init.call(self, options);

    self.writeStream = createWriteStream(destination);
    var lineNumber = 1; // careful: starts at 1

    function writeNextLine () {
      var chunks = [];
      var lineMaybePromise = self.getLine.call(self, function (chunk) {
        chunks.push(chunk);
      }, lineNumber);

      Q(lineMaybePromise)
        .then(function () {
          if (chunks.length) {
            lineNumber++;
            // write all chunks, wait for drain (if necessary), call itself
            niceWrite(self.writeStream, chunks.join("") + "\n")
              .then(writeNextLine)
              .catch(reject);
          } else {
            // end the write stream, close the file
            self.writeStream.end(resolve);
          }
        });
    }
    writeNextLine(); // kick off the writing
  });
};

BaseExporter.prototype.init = function (write, lineNumber) {
  throw new Error("init not overridden");
};

BaseExporter.prototype.getLine = function (write, lineNumber) {
  throw new Error("getLine not overridden");
};
