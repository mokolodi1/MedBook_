# MedBook Primary Collections

This package declares the base genomic and clinical collections required for MedBook.

The naming conventions and style guide here are relevant for all MedBook collections.

## Naming conventions

Mongo collection names should be snake case. Meteor collection names should be camel case and begin with a capital letter.

```js
import { Mongo } from 'meteor/mongo';

CollectionName = new Mongo.Collection("collection_name");
```

Attribute names should be snake case and should be descriptive. When representing the same data type across collections, the same attribute name should be used.

TODO
- labels

## Collections

These collections are the base collections for MedBook. A collection's mongo name refers to the name of the mongodb collection. (Aka `db.studies.findOne()` in the mongo shell.) A collection's Javascript name refers to the name referred to in MedBook's Javascript code. Javascript names are exported directly by `medbook:primary-collections` but can also be referenced through `MedBook.collections` (ex. `MedBook.collections.Studies`).

Each collection in MedBook has one of three security rules in MedBook.
- User-level security means that a user can see objects that have their _id in the `user_id` field.
- Collaboration-level security means a user can see objects when they have an intersection between their collaboration list and the collaboration list on the object.
- Study-level security means a user can see objects that belong to a study they have access to through collaboration-level security.

Sometimes figuring out whether a user has access to an object requires a join with another collection. In the case of study-level security, a join with the Studies collection is always required. The attributes to join with are noted in the table below. (For study-level security, the Studies attribute to join with is always `id`.)

| Mongo collection name | Javascript name  | Description | Security |
|-----------------------| -----------------|-------------|----------|
| `studies`             | Studies          | A study or clinical trial | collaboration |
| `gene_expression`         | GeneExpression      | Gene expression data | study (`study_label`) |
| `sample_groups`       | SampleGroups     | A list of samples from one or more studies. | collaboration |
| `collaboration`       | Collaborations   | A group of collaborators | See below |
| `users`               | Meteor.users     | Meteor users collection | N/A |

### Studies

A study refers to a specific study or clinical trial. Examples of such studies include TCGA (The Cancer Genome Atlas), CKCC (California Kids Cancer Comparison), and WCDT (West Coast Dream Team). A study object holds metadata information for a study (name, description) as well as study-level information such as which patients/samples are part of the study.

| Attribute                   | Meaning | Example |
| ----------------------------|---------|---------|
| `id`                        | The study label (or ID) of a study uniquely identifies a study and is the attribute which MedBook uses for joins accross collections. In most other collections this attribute is called `study_label`.  | `"tcga"` |
| `name`                      | Name of the study | `"TCGA"` |
| `description`               | Description of the study | `"The Cancer Genome Atlas is a comprehensive and coordinated effort ..."` |
| `sample_labels`                | List of valid sample labels in the study | `["TCGA-OR-A5JX-01", "TCGA-HV-A5A5-01", "TCGA-MQ-A4LP-01", ...]` |
| `Patient_IDs`               | List of valid patient labels in the study | `["TCGA-OR-A5JX-01", "TCGA-HV-A5A5-01", "TCGA-MQ-A4LP-01", ...]` |
| `patients`                  | List of valid patients in the study with each patients' list of valid samples. Note that not all samples are not associated with a patient. | `[ { patient_label: "TCGA-06-0190", sample_labels: ["TCGA-06-0190-01", "TCGA-06-0190-02"] }, ... ]` |
| `gene_expression`           | Sample labels array matching values array in `gene_expression` | `["TCGA-OR-A5JX-01", "TCGA-HV-A5A5-01", "TCGA-MQ-A4LP-01", ...]` |
| `gene_expression_index`     | Index for `gene_expression` (for fast lookup) | `{ "TCGA-OR-A5JX-01": 0, "TCGA-HV-A5A5-01": 1, "TCGA-MQ-A4LP-01": 2, ... }` |
| `gene_expression_genes`     | The gene set for the study gene expression data | `[ "A1BG", "A1CF", "A2BP1", "A2LD1", ... ]` |
| `gene_expression_wrangling` | Soft lock for wrangling gene expression data for a given study. | `false` |

Use `MedBook.referentialIntegrity.dataSets_expression3` in `medbook:referential-integrity` to maintain relationships between Studies and GeneExpression.

### GeneExpression

GeneExpression is the collection where MedBook stores gene expression data for each sample. Each object holds the data for every sample in a study (`study_label`) for a single gene (`gene_label`).

| Attribute                   | Meaning | Example |
| ----------------------------|---------|---------|
| `study_label`               | Study identifier | `"tcga"` |
| `gene_label`                | Gene identifier | `"MYC"` |
| `rsem_quan_log2`            | Quantile normalized counts data that underwent a log2(x+1) transform. For sample mapping see the Studies collection. | `[0, 4.283, 392.482, ...]` |

In MedBook history, there have been four different schemas for storing gene expression data. None of them matter except for GeneExpression because they are not used anymore. (Along the way one of them was called GeneExpression which is why it is GeneExpression instead of Expression4.)

<!-- ## Signature score workflow

1. A contrast is imported using Wrangler.
2. The contrast is used to train a signature.
3. The signature is used to generate signature scores for samples.  -->
