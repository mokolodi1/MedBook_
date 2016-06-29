# MedBook data model

## Collections

### Studies

A study is a namespace for samples. Having access to a study allows the user to view the sample labels in the study. Being an administrator to a study means the user can add sample labels and edit the study name and description. Having access to a study does not give a user access to any clinical records nor to any genomic information.

A study is uniquely identified by it's label. This label, such as `"WCDT"` or `"CKCC"` allows users to specify the study in files, such as clinical `.tsv`s. The study label also allows for unique naming of samples in instances where sample labels collide (ex. combining two studies each with a sample called `"A01"`). In such instances, the sample's name is shown as  `"STUDY/SAMPLE"` (ex. `"WCDT/DTB-001"`).

Other possible fields include PUBMED id and the type of cancer.

### Data sets

A data set is MedBook’s representation of a rectangular tab-separated file where each column represents a sample and each row represents a gene, isoform, or other genomic feature.

Examples of possible data sets:
- FPKM gene expression data for CKCC
- exon counts for WCDT
- signature scores for the TP53 signature applied to the WCDT gene expression data set
- WCDT + TCGA gene expression data after COMBAT batch correction

A data set has a value type, which describes what kind of data it contains (gene expression, signature scores, etc.). Each data set also has a metadata field which contains different information depending on the value type. Under most circumstances, data sets with differing metadata fields are not comparable.

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

In addition to the value type and metadata, each data set has a provenance field which contains a list of steps that were taken to generate the data set. For example:
1. uploaded by Robert Baertsch on June 15, 2016 (link to original data set)
2. BRCA1 signature applied by Ted Goldstein on June 16, 2016 (link to signature)

Data sets contain a list of samples in the form of study label and sample label tuples. (Sample labels alone are not globally unique.)

The actual data in a data set are stored in the GenomicExpression collection. GenomicExpression documents are simple data containers. They contain a reference to the data set they belong to as well as the feature label they contain data for. Finally, they contain a list of values such that each element contains the value for the correspondingly indexed sample in the samples list in the data set document.

### Forms and Records

A form is a set of one or more fields, each of which has a name and a type. A form can have records associated with it whose fields are described by the form. Drawing comparisons to a spreadsheet, a form is a description of the header row and each record is a single data row in the spreadsheet.

A record is uniquely identified by it's form, it's study label, and it's sample label. (Duplicates are not allowed.)

A user that has access to a form can view it's fields and records. They can also copy a form to create their own version, though this does not copy the form's records. An administrator of a form can add, modify, and delete records. A form's fields are immutable.

Reserved field names (for implementation purposes): `form_id`.

### Sample groups

Sample groups allow users to combine and filter genomic data. Sample groups contain a list of data sets and a list of samples for each data set.

To create a sample group, a user must have access to all of the data sets they are adding to the new sample group. If a user has access to a sample group they have access to the data in each of the sample groups' data sets even if they do not have access to those data sets on their own.

Possible use cases:
- Olena wants to combine the myeloid leukemia samples in both the TCGA gene expression data set and the TARGET gene expression data set in order to create a background group for her outlier analysis. TCGA and TARGET do not have harmonized clinical forms. She adds both data sets to the sample group and filters the data sets' samples based on the two different clinical forms.
- Alana wants run an analyses on the WCDT gene expression data set comparing old patients and young patients but she does not have access to the age at biopsy clinical information. Ted, who has access to the clinical information, creates two sample groups for Alana: one containing young patients and the other containing old patients. Here, Ted provides Alana the information she needs without providing her with the full clinical information.
- The CKCC team wants to share the gene expression data for only three samples with a third party provider. They create a sample group with those three samples and share that sample group with the third party provider.

All samples in a sample group must be unique. (A sample cannot be in multiple data sets.)

## Comments / Other

### Nomenclature: labels

Labels are human readable identifiers that are also machine readable. Some examples include `"WCDT"`, `"DTB-001"`, and `"TP53"`.

A label is a uniquely identifiable string within it's namespace.
- each study has a globally unique label
- within a study, each sample has a unique label (unique only within that study)
- within a data set, each feature (gene, isoform, etc) has a unique label

Labels can contain upper and lowercase letters, numbers, dashes, and underscores.

### Use cases

#### Sample selection

When a user is selecting a single sample, there should be two dropdown menus. In the first dropdown, the user chooses the data set or sample group. In the second dropdown the user choses the specific sample in that data set or sample group.

#### Background cohorts

When a user is selecting samples for a background cohort, there should be a dropdown menu. 

### TODO
- Blobs
- Patients
- GeneSetCollections
- GeneSets



Should we make `study_label` and `sample_label` reserved field names in forms, allowing us to easily search records without having to look up form object?

I'm tying down what a record is. I don't want them to be a catch-all. Is this okay?
