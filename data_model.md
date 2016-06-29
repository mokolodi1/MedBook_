# MedBook data model

## Collections

### Studies and Samples

A *study* is a namespace for samples. A sample is merely a string contained within a study document; there are no *sample* documents.

A study has collaboration security. Users with access to a study can view all fields in the study, including sample labels; this does not provide access to genomic information or clinical data. Administrators of a study can add sample labels and edit the study name and description.

A study is uniquely identified by its *label*. This label, such as `"WCDT"` or `"CKCC"`, allows users to specify the study in files, such as clinical `.tsv`s. The study label also allows for unique naming of samples in instances where sample labels collide (ex. combining two studies each with a sample called `"A01"`). In such instances, the sample's name is shown as  `"STUDY/SAMPLE"` (ex. `"WCDT/DTB-001"`).

Other possible study fields include PUBMED id and the type of cancer.

S in MedBook are defined in a study and there is no samples collection.

### Data sets

A *data set* is MedBook’s representation of a rectangular tab-separated file where each column represents a sample and each row represents a gene, isoform, or other genomic feature.

Administrators of a data set may incrementally add new columns (samples) to a data set; the rows (genomic features) are immutable and defined by the feature set of the first added sample.

Examples of possible data sets:
- FPKM gene expression data for CKCC
- exon counts for WCDT
- signature scores for the TP53 signature applied to the WCDT gene expression data set
- WCDT + TCGA gene expression data after COMBAT batch correction

A data set has a value type, which describes what kind of data it contains (gene expression, signature scores, etc). Each data set also has a metadata field which contains different information depending on the value type. Under most circumstances, data sets with differing metadata fields are not comparable.

Here is a list of proposed value types and metadata fields associated with each:
- gene expression
  - normalization (quantile counts, RSEM, TPM, raw counts)
  - quantification method (RSEM, Cufflinks, kallisto, etc.)
  - genome assembly (hg19, hg38)
  - scaling (none, log2(x+1))
  - strandedness (stranded, unstranded, unknown)
  - sequencing selection method (polyA)
  - aligner used (STAR, TopHat)
- isoform expression
- exon counts
- signature scores
  - signature (id of the signature that was applied)
  - algorithm of signature (limma, viper)
  - feature type (genes, isoforms)
- viper scores
- paradigm scores

In addition to the value type and metadata, each data set has a provenance field. The details of this field will be defined in a future version of this document. The intent is to store the steps that were taken to generate the data set.

For example:
1. uploaded by Robert Baertsch on June 15, 2016 (link to original data set)
2. BRCA1 signature applied by Ted Goldstein on June 16, 2016 (link to signature)

Data sets contain a list of samples in the form of study label/sample label tuples. (Sample labels alone are not globally unique.)

The actual data in a data set are stored in the GenomicExpression collection. GenomicExpression documents are simple data containers. They contain a reference to the data set they belong to as well as the feature label they contain data for. Finally, they contain a list of values such that each element contains the value for the correspondingly indexed sample in the samples list in the data set document.

### Forms and Records

A form is a set of one or more fields, each of which has a name and a type. A form can have records associated with it whose fields are described by the form. Drawing comparisons to a spreadsheet, a form is a description of the header row and each record is a single data row in the spreadsheet.

Each record in a form is uniquely identified by its study/sample label tuple.

Forms have collaboration security. A user with access to a form can view its fields and records.

Users should be able to browse publically listed

A form can be "publicly copyiable"; this indicates that anyone can view the fields of a form




They can also copy a form to create their own version, though this does not copy the form's records. An administrator of a form can add, modify, and delete records. A form's fields are immutable.

Reserved field names (for implementation purposes): `form_id`.

### Sample groups

Sample groups allow users to combine and filter genomic data. Sample groups contain a list of data sets and a list of samples for each data set.

To create a sample group, a user must have access to all of the data sets they are adding to the new sample group. If a user has access to a sample group they have access to the data in each of the sample groups' data sets even if they do not have access to those data sets on their own.

Possible use cases:
- Olena wants to combine the myeloid leukemia samples in both the TCGA gene expression data set and the TARGET gene expression data set in order to create a background group for her outlier analysis. TCGA and TARGET do not have harmonized clinical forms. She adds both data sets to the sample group and filters the data sets' samples based on the two different clinical forms.
- Alana wants run an analyses on the WCDT gene expression data set comparing old patients and young patients but she does not have access to the age at biopsy clinical information. Ted, who has access to the clinical information, creates two sample groups for Alana: one containing young patients and the other containing old patients. Here, Ted provides Alana the information she needs without providing her with the full clinical information.
- The CKCC team wants to share the gene expression data for only three samples with a third party provider. They create a sample group with those three samples and share that sample group with the third party provider.

All samples in a sample group must be unique. (A sample cannot be in multiple data sets.)

### Blobs

Blob documents are metadata for files. All files are stored in a central directory shared by all apps, much like how mongo is shared.

Each blob must be associated with an object in another collection that has collaboration security. A user has access to a blob if they have access to blob's associated object.

Periodically a job runs and deletes all blobs that do not have an associated object or have had their associated objects deleted. This job also deletes blobs that have not finished writing. (This creates a soft cap on the size of the blob; it must be writable to the directory in less than a day.)

Blobs themselves do not have expiration dates. Some associated objects may delete their blobs. 

Each blob has a path where its file is stored. The file is stored within that folder and the file's name is the `_id` of the blob.

The file associated with a blob is immutable.

### Patients

Treating patients is one of the core goals of MedBook, and the patient object serves as a focal point, bringing together many disparate data.

Each patient has a globally unique patient label. Each patient has one or more samples associated with it.

## Comments / Other

### Nomenclature: labels

Labels are human readable identifiers that are also machine readable. Some examples include `"WCDT"`, `"DTB-001"`, and `"TP53"`.

A name is not a label: names can contain spaces and other special characters. Names can also be changed after creation while labels cannot.

A label is a unique string within its namespace:
- each study has a globally unique label
- within a study, each sample has a unique label (unique only within that study)
- within a data set, each feature (gene, isoform, etc) has a unique label

Labels can contain only upper and lowercase letters, numbers, dashes, and underscores.

### Use cases

#### Sample selection

When a user is selecting a single sample, there should be two dropdown menus. In the first dropdown, the user chooses the data set or sample group. In the second dropdown the user choses the specific sample in that data set or sample group.

#### Background cohorts

When a user is selecting samples for a background cohort, there should be a dropdown menu. The last used sample groups should be listed first, along with an option to create a new sample group. When the user types, the options should be filtered by name and the names of contained data sets.

#### Patients page

On the patients page there should be a UI for associating a sample with a patient. There should be a place to create new dialogue chains related to the patient, each with comments.

### TODO
- Blobs
- GeneSetCollections
- GeneSets

### Thoughts

Should we make `study_label` and `sample_label` reserved field names in forms, allowing us to easily search records without having to look up form object?

I'm tying down what a record is. I don't want them to be a catch-all. Is this okay?

Should we just rename blobs' files to be the mongo `_id`s instead of nesting them in a folder with the _id?

I don't know if it's a great idea to require patients to have globally unique names. Because patients can be in more than one study, I don't know what container they could go into.

MongoDb keys names (that are in most documents in a collection) should be short to optimize space and performance. Should we use short key names?  See http://christophermaier.name/blog/2011/05/22/MongoDB-key-names
