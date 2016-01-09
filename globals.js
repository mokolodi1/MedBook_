Q = Npm.require("q");
fs = Npm.require("fs");

// creates a read stream given a variety of different possible destinations
// examples:
// createWriteStream(blob)
// createWriteStream("blob_id")
// createWriteStream("filePath")
// createWriteStream(writeStream)
createWriteStream = function (destination) {
  if (typeof destination === "string") {
    console.log("writing to file " + destination);
    return fs.createWriteStream(destination);
  } else {
    throw new Error("can't create write stream with provided destination");
  }
};

checkOptions = function (options, schema) {
  if (!options) {
    throw new Error("no options provided");
  }

  try {
    check(options, schema);
  } catch (e) {
    throw new Error("incorrect options: " + e);
  }
};
