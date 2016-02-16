Package.describe({
  name: 'medbook:collaborations',
  version: '2.4.6',
  summary: 'Collaboration based security architecture (similar to Roles and Friends)',
  git: 'https://github.com/UCSC-MedBook/collaborations',
  documentation: 'README.md'
});

Package.onUse(function (api) {
  api.versionsFrom('1.1.0.3');

  api.use("accounts-base@1.2.0");
//  api.use("tracker@1.0.7");

  // NOTE: have to load lodash first
//  api.use("erasaur:meteor-lodash@4.0.0");
//  api.use("underscore@1.0.3");

  api.use([
    "aldeed:simple-schema@1.3.3", // attaching the schema to Collaborations
    "aldeed:collection2@2.3.3 || 2.7.0", // don't know if that's necessary
    // api.use("aldeed:autoform@4.2.2 || 5.0.0");
    "medbook:namespace@0.0.2",
    "medbook:primary-collections@0.0.16",
    "mokolodi1:helpers@0.0.10",
    "twbs:bootstrap@3.3.6",
    "aldeed:template-extension@3.4.3 || 4.0.0",
    "peppelg:bootstrap-3-modal@1.0.4", // to make the modal show up
//    "reactive-var@1.0.5",
    // "sacha:spin@2.3.1",
  ]);
  api.imply("medbook:namespace@0.0.2");

  api.use("templating@1.1.1", "client");

  api.addFiles([
    "client.js",
    "editCollaborations.html",
    "editCollaborations.js",
  ], "client");

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
  api.versionsFrom('1.1.0.3');

  // console.log("No tests yet :(");
});
