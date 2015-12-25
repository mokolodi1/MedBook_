Package.describe({
  name: 'medbook:primary-collections',
  version: '0.0.11',
  // Brief, one-line summary of the package.
  summary: 'Primary collections and schemas for MedBook',
  // URL to the Git repository containing the source code for this package.
  git: 'https://github.com/UCSC-MedBook/MedBook-primary-collections',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.1.0.3');

  api.use('aldeed:simple-schema@1.3.3');
  api.use('aldeed:collection2@2.3.3');
  api.use('aldeed:autoform@4.2.2 || 5.0.0');
  api.use('underscore');

  api.addFiles('primary_collections.js');

  // already have their own files
  api.addFiles('GeneExpression.js');
  api.export('GeneExpression');
  api.export('Expression2');

  // api.addFiles('GeneExpressionSummary.js');
  // api.export('GeneExpressionSummary');

  api.addFiles('IsoformExpression.js');
  api.export('IsoformExpression');
  // api.export('ExpressionIsoform');

  api.addFiles('Jobs.js');
  api.export('Jobs');

  api.addFiles('Networks.js');
  api.export('Networks');
  api.export('NetworkElements');
  api.export('NetworkInteractions');

  api.addFiles('Genes.js');
  api.export('Genes');


  // Blobs
  api.use('cfs:gridfs@0.0.33');
  api.use('cfs:standard-packages@0.5.9');
  api.addFiles('Blobs.js');
  api.export('Blobs');
  api.export('BlobStore', 'server');

  api.export('Studies');
  api.export('Collabs'); // it won't work when called Collaborations
  api.export('Collaboration');

  api.export('Patients');
  api.export('Signatures');
  api.export('CohortSignatures');
  api.export('Mutations');
  api.export('Superpathways');
  api.export('SuperpathwayElements');
  api.export('SuperpathwayInteractions');
  api.export('Mutations');
  api.export("Genes");
  api.export('Jobs');
  api.export('Contrast');


});

Package.onTest(function(api) {
  // I've never used this
  api.use('tinytest');
  api.addFiles('primary_collections_tests.js');
});
