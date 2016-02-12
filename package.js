Package.describe({
  name: 'medbook:collaborations',
  version: '2.4.0',
  summary: 'Collaboration based security architecture (similar to Roles and Friends)',
  git: 'https://github.com/UCSC-MedBook/collaborations',
  documentation: 'README.md'
});

Package.onUse(function (api) {
  api.versionsFrom('1.1.0.3');

  api.use("accounts-base@1.2.0");
  api.use("tracker@1.0.7");
  api.use("underscore");

  // attaching the schema to Collaborations
  api.use("aldeed:simple-schema@1.3.3");
  api.use("aldeed:collection2@2.3.3");
  // api.use("aldeed:autoform@4.2.2 || 5.0.0");

  api.use("medbook:namespace@0.0.2");
  api.imply("medbook:namespace@0.0.2");

  // Collaborations is defined in client.js
  api.addFiles("client.js", "client");

  // api.addFiles("client.js", "client");
  api.addFiles([
    "server.js",
    "collaborationFunctionality.js",
  ], "server");

  api.addFiles([
    "both.js",
  ], ["client", "server"]);
  api.export("Collaborations"); // defined seperately on client/server
});




Package.onTest(function (api) {
  api.versionsFrom('1.1.0.2');

  // console.log("No tests yet :(");
});
