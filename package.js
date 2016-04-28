Package.describe({
  name: 'medbook:collaborations',
  version: '2.4.12',
  summary: 'Collaboration based security architecture (similar to Roles and Friends)',
  git: 'https://github.com/UCSC-MedBook/collaborations',
  documentation: 'README.md'
});

Package.onUse(function (api) {
  api.versionsFrom('1.1.0.3');

  api.use("reactive-var");
  api.use("accounts-base@1.2.0");
  api.use("tracker@1.0.7");

  // NOTE: have to load lodash first
  api.use("erasaur:meteor-lodash@4.0.0");
  api.use("underscore@1.0.3");

  api.use([
    "aldeed:simple-schema@1.3.3", // attaching the schema to Collaborations
    "aldeed:collection2@2.3.3 || 2.7.0", // don't know if that's necessary
    "medbook:namespace@0.0.2",
    "medbook:primary-collections@0.0.17",
    "mokolodi1:helpers@0.0.10",
  ]);
  api.imply("medbook:namespace@0.0.2");


  api.addFiles([
    "client.js",
  ], "client");

  api.addFiles([
    "collaborationFunctionality.js",
    "server.js",
  ], "server");

  api.addFiles([
    "both.js",
  ], ["client", "server"]);
  api.export("Collaborations"); // defined seperately on client/server
});




// Package.onTest(function (api) {
//   api.versionsFrom('1.1.0.3');
//   api.use(["meteor-file", "tinytest", "test-helpers"])
//
//   api.addFiles("tests.js");
// });
