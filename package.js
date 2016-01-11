Package.describe({
  name: "medbook:adapters",
  version: "0.0.1",
  // Brief, one-line summary of the package.
  summary: "convert back and forth between files and MedBook objects",
  // URL to the Git repository containing the source code for this package.
  git: "https://github.com/UCSC-MedBook/MedBook-adapters",
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: null
});

Npm.depends({"q": "1.2.0"});

Package.onUse(function(api) {
  api.versionsFrom("1.1.0.3");

  api.use("underscore");
  api.use("aldeed:simple-schema@1.3.3");
  api.use("meteorhacks:aggregate@1.3.0");
  api.use("medbook:primary-collections@0.0.13");

  api.addFiles("globals.js", "server");

  // exporters
  api.addFiles([
    "export/Export.js",
    "export/BaseExporter.js",
    "export/LimmaPhenotype.js",
    "export/GeneExpressionMatrix.js",
  ], "server");
  api.export("Export", "server");
});

Package.onTest(function(api) {
  api.use("ecmascript");
  api.use("tinytest");
  api.use("medbook:adapters");
  api.addFiles("adapters-tests.js");
});
