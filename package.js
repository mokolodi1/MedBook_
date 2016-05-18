Package.describe({
  name: 'medbook:referential-integrity',
  version: '0.0.2',
  // Brief, one-line summary of the package.
  summary: "Maintains referential integrity for MedBook collections",
  // URL to the Git repository containing the source code for this package.
  git: "https://github.com/UCSC-MedBook/referential-integrity",
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: null
});

Package.onUse(function(api) {
  api.versionsFrom("1.1.0.3");

  api.use("underscore");
  api.use("meteorhacks:aggregate@1.3.0");
  api.use("mokolodi1:helpers@0.0.11");

  api.use("medbook:primary-collections@0.0.19");
  api.use("medbook:namespace@0.0.2");

  api.addFiles([
    "introduction.js",
    "dataSets_expression3.js",
  ], "server");
});

Package.onTest(function(api) {
  api.use("tinytest");
});
