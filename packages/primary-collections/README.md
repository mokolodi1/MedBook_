# MedBook Primary Collections

This package declares the base genomic and clinical collections required for MedBook.

## Security

The MedBook data model has two security models: collaboration security and associated object security. There are some object types for which both security types are valid, but each object can only implement one type of security.

### Collaboration security

Collaboration security means that an object can be "shared" with one or more collaborations.

Unless otherwise specified, the creator of an object starts as the sole collaborator and sole administrator of the object. From that point on, the administrators of an object can share the object (add/remove collaborators and administrators) as well as change (edit) the object as specified in the data model. Collaborators can view the object but cannot edit the object in any way without cloning it.

Collaboration security is implemented with two arrays of strings: `collaborations` and `administrators`. These lists contain one or more collaborations: either personal collaborations or names of collaborations.

An example object with collaboration security:
```json
{
  "administrators": [ "ted@soe.ucsc.edu" ],
  "collaborations": [ "ted@soe.ucsc.edu", "dtflemin@ucsc.edu", "CKCC" ]
}
```

NOTE: Currently, the collaborations list is the same as the administrators list, and collaborators have full administrative power.

### Associated object security

Objects with associated object security inherit security from their associated object. In most (but not all) cases, the inherited security is collaboration security.

Associated objects are notated by their collection name and mongo id. The collection name is the Javascript name, not the mongo name (e.g. `"GeneSets"`, not `"gene_sets"`).

Associated objects can have an optional metadata field that is used to distinguish between multiple objects with the same associated object. For example, if there are three gene sets linked to a single outlier analysis job, they might be distinguished by their outlier type. (See example.) The metadata field is a blackboxed object, which means it has no set schema. (This may change in the future, but for now it's not clear which fields the schema would depend on.)

Example JSON for an  object with associated object security:

```json
{
  "associated_object": {
    "collection_name": "Jobs",
    "mongo_id": "9jaJQuEwX7ar7Cnva"
  },
  "metadata": {
    "outlier_type": "up"
  }
}
```

## Data model

### Collections

#### Studies and Samples

A *study* is a namespace for samples. A *sample* is merely a string contained within a study document; there are no sample documents.

A study is uniquely identified by its label. This label, such as `"prad_wcdt"` or `"CKCC"`, allows for unique naming of samples in instances where sample labels collide (ex. combining two studies each with a sample called `"A01"`). In such instances, the sample's name is shown as  `"STUDY/SAMPLE"` (ex. `"prad_wcdt/DTB-001"`).

A study has collaboration security. Users with access to a study can view all fields in the study, including sample labels; this does not provide access to any genomic information or clinical data. Administrators of a study can add sample labels, rename sample labels, and edit the study name, the description, and the study label.

Other possible study fields include PUBMED id and the type of cancer.

#### Data sets

A *data set* represents a rectangular tab-separated file where each column represents a sample and each row represents a gene, isoform, or other genomic feature.

Examples of possible data sets:
- FPKM gene expression data for CKCC
- exon counts for WCDT
- signature scores for the TP53 signature applied to the WCDT gene expression data set
- WCDT + TCGA gene expression data after COMBAT batch correction

A data set has a value type, which describes what kind of data it contains (gene expression, signature scores, etc). Each data set also has a metadata field which contains different information depending on the value type. Under most circumstances, data sets with differing metadata fields are not scientifically comparable.

Here is the list of value types and metadata fields associated with each:
- gene expression
  - normalization (quantile counts, RSEM, TPM, raw counts)
  - quantification method (RSEM, Cufflinks, kallisto, etc.)
  - genome assembly (hg19, hg38)
  - value_scaling (none, log2(x+1))
  - read_strandedness (stranded, unstranded, unknown)
  - unimplemented fields:
    - sequencing selection method (polyA)
    - aligner used (STAR, TopHat)
    - PacBio vs. Illumina sequencing
- unimplemented types:
  - copy number
  - isoform expression
  - exon counts
  - signature scores
    - signature (id of the signature that was applied)
    - algorithm of signature (limma, viper)
    - feature type (genes, isoforms)
  - viper scores
  - paradigm scores

In addition to the value type and metadata, each data set will have a provenance field. The details of this field will be defined in a future version of this document. The intent is to store the steps that were taken to generate the data set.

For example:
1. uploaded by Robert Baertsch on June 15, 2016 (link to original data set)
2. BRCA1 signature applied by Ted Goldstein on June 16, 2016 (link to signature)

Data sets contain a list of samples in the form of study label/sample label tuples. (Sample labels alone are not globally unique.)

The actual data in a data set are stored in the GenomicExpression collection. GenomicExpression documents are simple data containers. They contain a reference to the data set they belong to as well as the feature label they contain data for. Finally, they contain a list of values such that each element contains the value for the correspondingly indexed sample in the samples list in the data set document.

Only one user can add data to a data set at once. This is enforced by the `currently_wrangling` soft lock.

Data sets have collaboration security. Administrators of a data set may incrementally add new columns (samples) to a data set; the rows (genomic features) are immutable and defined by the feature set of the first added sample. Collaborators can view the data set but cannot make changes.

#### Forms

A form is a set of one or more fields, each of which has a name and a type. A form has records associated with it whose fields are described by the form. Drawing comparisons to a spreadsheet, a form is a description of the header row and each record is a single data row in the spreadsheet.

Each record in a form is uniquely identified by its form and its sample label.

Forms have collaboration security. A user with access to a form can view its fields and records.

A form can be "publicly copyable"; this indicates that anyone can view the fields of a form but not the records.

They can also copy a form to create their own version, though this does not copy the form's records. An administrator of a form can add, modify, and delete records. A form's fields are immutable.

Within a form, field names must be unique.

Reserved field names (for implementation purposes): `_id`, `associated_object`.

#### Sample groups

Sample groups allow users to combine and filter genomic data. Sample groups contain a list of data sets and a list of samples for each data set.

To create a sample group, a user must have access to all of the data sets they are adding to the new sample group. If a user has access to a sample group they have access to the data in each of the sample groups' data sets even if they do not have access to those data sets on their own.

Possible use cases:
- Olena wants to combine the myeloid leukemia samples in both the TCGA gene expression data set and the TARGET gene expression data set in order to create a background group for her outlier analysis. TCGA and TARGET do not have harmonized clinical forms. She adds both data sets to the sample group and filters the data sets' samples based on the two different clinical forms.
- Alana wants run an analyses on the WCDT gene expression data set comparing old patients and young patients but she does not have access to the age at biopsy clinical information. Ted, who has access to the clinical information, creates two sample groups for Alana: one containing young patients and the other containing old patients. Here, Ted provides Alana the information she needs without providing her with the full clinical information.
- The CKCC team wants to share the gene expression data for only three samples with a third party provider. They create a sample group with those three samples and share that sample group with the third party provider.

All samples in a sample group must be unique. (A sample cannot be in multiple data sets.)

Sample groups have collaboration security, with the right to change collaborators reserved for administrators.

#### Gene sets

Gene sets are a set of genes that have some relevance to each other. They have a list of genes as well as a set of columns associated with each gene.

The data for gene sets (the list of genes and associated values) are stored as records, much like with forms.

Gene sets can have collaboration security, gene set group security, or associated object security depending on if `collaborations`, `gene_set_group_id`, or `associated_object` respectively is set. Only one type of security is valid per object. Associated object security would be used when a job created the gene set.

Gene sets may be copied to a new security model. For example, a user may want to share a gene set created by an outlier analysis job without sharing the whole job. The user would copy the gene set to a new gene set with collaboration security.

#### Gene set groups

Gene set groups are a collection of gene sets. They are created by importing a `.gmt` file.

The gene sets in a gene set group are stored as gene sets and are linked by mongo id.

Gene sets that are part of gene set groups do not have records associated with them, as they do not have columns other than the gene label. The gene list is already stored on every gene set object, which is where gene set groups should look for the gene data.

Gene set groups have collaboration security and are immutable.

#### Records

Records are objects in MedBook that users will never directly interact with.

Records are "dumb" data stores for other MedBook data types. (Currently that list includes gene sets, forms, and might soon include mutations.) Records inherit security from their associated objects: a collection name, mongo id tuple.

To use records and their associated widgets, a schema must define the following attributes:
- the name of the field that will serve as the primary key
- an array containing all primary keys for which there are records (for easy lookup)
- an array of field definitions for each record

#### Blobs

Blob documents are metadata for files. All files are stored in a central directory shared by all apps, much like how mongo is shared.

Each blob must be associated with an object in another collection that has collaboration security. A user has access to a blob if they have access to blob's associated object.

Periodically a job runs and deletes all blobs that do not have an associated object or have had their associated objects deleted.

Blobs themselves do not have expiration dates. Some associated object types may have jobs to delete their blobs periodically.

Each blob has a path where its file is stored, relative to the shared blobs storage folder.

The file associated with a blob is immutable.

#### Jobs

A job represents a single run of a specific MedBook job.

Depending on the job type, it may have collaboration security or another type of security inherited from another object.

#### Patients

Treating patients is one of the core goals of MedBook, and the patient object serves as a focal point, bringing together many disparate data.

Each patient has a globally unique patient label. Each patient has one or more samples associated with it.

### Comments / Other

#### Nomenclature: labels

Labels are human readable identifiers that are also machine readable. Some examples include `"WCDT"`, `"DTB-001"`, and `"TP53"`.

A name is not a label: names can contain spaces and other special characters. Names can also be changed after creation while labels cannot.

A label is a unique string within its namespace:
- each study has a globally unique label
- within a study, each sample has a unique label (unique only within that study)
- within a data set, each feature (gene, isoform, etc) has a unique label

Labels can contain only upper and lowercase letters, numbers, dashes, and underscores.

#### Use cases

##### Sample selection

When a user is selecting a single sample, there should be two dropdown menus. In the first dropdown, the user chooses the data set or sample group. In the second dropdown the user choses the specific sample in that data set or sample group.

##### Background cohorts

When a user is selecting samples for a background cohort, there should be a dropdown menu. The last used sample groups should be listed first, along with an option to create a new sample group. When the user types, the options should be filtered by name and the names of contained data sets.

##### Patients page

On the patients page there should be a UI for associating a sample with a patient. There should be a place to create new dialogue chains related to the patient, each with comments.

#### Thoughts

Should we make `study_label` and `sample_label` reserved field names in forms, allowing us to easily search records without having to look up form object?

I'm tying down what a record is. I don't want them to be a catch-all. Is this okay?

Should we just rename blobs' files to be the mongo `_id`s instead of nesting them in a folder with the id?

I don't know if it's a great idea to require patients to have globally unique names. Because patients can be in more than one study, I don't know what container they could go into.

MongoDb keys names (that are in most documents in a collection) should be short to optimize space and performance. Should we use short key names?  See http://christophermaier.name/blog/2011/05/22/MongoDB-key-names


## Utilities

##### `MedBook.utility.sampleObjToStr()`
Takes a sample object (`{ study_label, uq_sample_label }`) and returns a fully qualified sample string (`"STUDY/SAMPLE"`).

##### `MedBook.utility.sampleStrToObj()`
Takes a fully qualified sample string (`"STUDY/SAMPLE"`) and returns a sample object (`{ study_label, uq_sample_label }`).

##### `MedBook.utility.sampleArrObjToStr()`
Functionality for `MedBook.utility.sampleObjToStr()` for an array of objects.

##### `MedBook.utility.sampleArrStrToObj()`
Functionality for `MedBook.utility.sampleStrToObj()` for an array of strings.

##### `MedBook.utility.unqualifySampleLabels(sampleLabels)`
Returns an array of unqualified sample labels. Unqualified sample labels are regular sample labels with the study labels (and slashes) removed. (Ex: `WCDT/DTB-001` => `DTB-001`)

##### `MedBook.utility.slugToString`
Maps from programmer-friendly strings like `"quan_norm_counts"` to human-friendly strings like `"quantile normalized counts"`. Outputs are capitalized as if they are in the middle of a sentence with a lowercase first letter except in cases like `"FPKM"`. If a mapping doesn't exist, the input is returned.
