Package.describe({
  name: "medbook:blobs",
  version: "0.0.1",
  summary: "Blobs stored on the filesystem",
  git: "https://github.com/UCSC-MedBook/blobs",
  documentation: "README.md"
});

Npm.depends({
  "mv": "2.1.1"
});

Package.onUse(function(api) {
  api.versionsFrom("1.1.0.3");

  api.use([
    "aldeed:simple-schema@1.3.3",
    "aldeed:collection2@2.3.3",
    "underscore",
    "check",
  ]);

  api.addFiles("collections.js", "server");
  api.export("Blobs2");

  api.addFiles("configuration.js", "server");
});

Package.onTest(function(api) {
  // nope
  // api.use("tinytest");
  // api.addFiles("yop.js");
});
