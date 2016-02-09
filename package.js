
Package.describe({
  name: 'medbook:collaborations',
  version: '2.3.4',
  summary: 'Collaboration based security architecture (similar to Roles and Friends)',
  git: 'https://github.com/UCSC-MedBook/collaborations',
  documentation: 'README.md'
});

Package.onUse(function (api) {
  api.versionsFrom('1.1.0.3');

  api.use("accounts-base@1.2.0");
  api.use("tracker@1.0.7");
  api.use("underscore");

  api.use("aldeed:simple-schema@1.3.3");
  api.use("aldeed:collection2@2.3.3");
  api.use("aldeed:autoform@4.2.2 || 5.0.0");

  api.addFiles("collections.js");
  api.export("Collaborations");

  // api.addFiles("client.js", "client");
  api.addFiles([
    "server.js",
    "collaborationsTransform.js",
  ], "server");
});




Package.onTest(function (api) {
  api.versionsFrom('1.1.0.2');

  // console.log("No tests yet :(");
});
