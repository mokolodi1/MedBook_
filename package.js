Package.describe({
  name: "medbook:primary-collections",
  version: "0.0.14",
  // Brief, one-line summary of the package.
  summary: "Primary collections and schemas for MedBook",
  // URL to the Git repository containing the source code for this package.
  git: "https://github.com/UCSC-MedBook/MedBook-primary-collections",
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: "README.md"
});

Package.onUse(function(api) {
  api.versionsFrom("1.1.0.3");

  api.use("aldeed:simple-schema@1.3.3");
  api.use("aldeed:collection2@2.3.3");
  api.use("aldeed:autoform@4.2.2 || 5.0.0");
  api.use("underscore");

  // genomic expression
  api.addFiles("GeneExpression.js");
  api.export("GeneExpression");
  api.export("Expression2");
  // api.addFiles("GeneExpressionSummary.js");
  // api.export("GeneExpressionSummary");
  api.addFiles("IsoformExpression.js");
  api.export("IsoformExpression");
  // api.export("ExpressionIsoform"); // old version of IsoformExpression
  api.addFiles("GeneAnnotation.js");
  api.export("GeneAnnotation");

  // Workbench collections (contrast ==> signature ==> signature scores)
  api.addFiles("Contrasts.js");
  api.export("Contrasts");
  api.addFiles("Signatures.js");
  api.export("Signatures");
  api.addFiles("SignatureScores.js");
  api.export("SignatureScores");

  // networks
  api.addFiles("Networks.js");
  api.export("Networks");
  api.export("NetworkElements");
  api.export("NetworkInteractions");

  // utility collections
  api.addFiles("Genes.js");
  api.export("Genes");
  api.addFiles("Jobs.js");
  api.export("Jobs");

  // blobs
  api.use("cfs:gridfs@0.0.33");
  api.use("cfs:standard-packages@0.5.9");
  api.addFiles("Blobs.js");
  api.export("Blobs");
  api.export("BlobStore", "server");

  // Older stuff below this line

  api.addFiles("primary_collections.js");

  api.export("Studies");
  api.export("Collabs"); // it won"t work when called Collaborations
  api.export("Collaboration");

  api.export("Patients");

  api.export("CohortSignatures");
  api.export("Mutations");
});

Package.onTest(function(api) {
  // nope
  api.use("tinytest");
  api.addFiles("primary_collections_tests.js");
});
