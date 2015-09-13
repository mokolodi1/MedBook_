
Package.describe({
  name: 'clinical:collaborations',
  version: '1.0.0',
  summary: 'Collaboration based security architecture (similar to Roles and Friends)',
  git: 'https://github.com/UCSC-MedBook/MedBook-Telescope/tree/master/packages/clinical-collaborations',
  documentation: 'README.md'
});

Package.onUse(function (api) {

  api.use([
    'aldeed:simple-schema',
    'less',
    'http',
    'underscore'
  ], ['client', 'server']);

  api.addFiles([
    'client/subscriptions.js',
  ], ['client']);

  api.addFiles([
    'lib/collection.collaborations.js',
    'lib/extentions.js',
    'lib/object.collaboration.js',
    'lib/object.user.js'
  ], ['client', 'server']);

  api.addFiles([
    'server/accounts.js',
    'server/helpers.js',
    'server/http.js',
    'server/methods.js',
    'server/publications.js'
  ], ['server']);


  api.export([
    'Schemas',
    'Collaborations',
    'Collaboration',
    'User'
  ]);
});
