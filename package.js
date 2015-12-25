Package.describe({
  name: 'medbook:wrangler-collections',
  version: '0.0.16',
  // Brief, one-line summary of the package.
  summary: 'Collections and such relating to Wrangler',
  // URL to the Git repository containing the source code for this package.
  git: '',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: null
});

Npm.depends({"binary-search": "1.2.0"});

Package.onUse(function(api) {
  api.versionsFrom('1.1.0.3');

  api.use('underscore');
  api.use('aldeed:simple-schema@1.3.3');
  api.use('aldeed:autoform@5.5.1');
  api.use("mokolodi1:helpers@0.0.3");
  api.use('medbook:primary-collections@0.0.11');

  // the definitions are loaded first so that indexes can be ensured in
  // the file handlers
  api.addFiles('wranglerCollectionsDefinitions.js');
  api.export('WranglerSubmissions');
  api.export('WranglerDocuments');
  api.export('WranglerFiles');

  // TODO: move this to primary-collections once I get the validation code
  // from Ted
  api.addFiles("collections.js");
  api.export("CRFs");

  api.addFiles([
    'fileHandlers/globals.js',
    'fileHandlers/FileHandler.js',
    'fileHandlers/TabSeperatedFile.js',
    'fileHandlers/RectangularGeneAssay.js',
    'fileHandlers/RectangularGeneExpression.js',
    'fileHandlers/RectangularIsoformExpression.js',
    'fileHandlers/BD2KSampleLabelMap.js',
    'fileHandlers/ArachneRegulon.js',

    // Admin stuff
    'fileHandlers/HGNCGeneList.js',
    'fileHandlers/GeneTranscriptMappings.js',
  ], 'server');
  api.export('WranglerFileTypes', 'server');

  api.addFiles('Wrangler.js'); // both
  api.export('Wrangler');

  api.addFiles('wranglerCollectionsSchemas.js');

  // api.addFiles('WranglerFileTypes.js');

  // TODO: remove this when we move the schemas to collections
  api.export('getCollectionByName');
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('medbook:wrangler-collections');
  api.addFiles('wrangler-collections-tests.js');
});
