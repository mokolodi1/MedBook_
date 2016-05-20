# Thoughts on sharing in MedBook

### Example documents

#### `db.data_sets.findOne({ name: "West Coast Dream Team" })`
```json
{
  "_id": "ABC123_wcdt_mongo_id",
  "name": "West Coast Dream Team",
  "description": "Castration Resistant Prostate Cancer",
  "collaborations": [
    "WCDT"
  ],
  "gene_expression": [ "DTB-001", "DTB-002", "DTB-003" ],
  "gene_expression_index": { "DTB-001": 0, "DTB-002": 1, "DTB-003": 2 },
  "gene_expression_genes": [ "MYC", "BRCA1", "TP53" ],
  "gene_expression_wrangling": false
}
```

#### `db.expression3.find({ data_set_id: "ABC123_wcdt_mongo_id" })`
```json
{
  "data_set_id": "ABC123_wcdt_mongo_id",
  "gene_label": "MYC",
  "rsem_quan_log2": [ 0, 35.243, 12.948 ]
}
```

Here is an example patient document:
#### `db.patients.find({ "patient_label": "DTB-001" })`
```json
{
  "collaborations": [ "WCDT" ],
  "patient_label": "DTB-001",
  "samples": [
    {
      "sample_label": "DTB-001",
      "data_set_id": "54795e11b089fea9740779e4",
    },
    {
      "sample_label": "DTB-001Pro",
      "data_set_id": "54795e11b089fea9740779e4",
    }
  ],
}
```

### Discussion

Data sets are for storing the metadata for large processed genomic data, such as RNA Sequencing data.

Patients can be part of multiple collaborations and the sharing is not study-level. This means that people like Olena can see all of her patients in the "CKCC Analysis Group" collaboration and the same patient can be in the "Stanford PNOC-001" tumor board collaboration. In PatientCare, researchers/doctors will select a collaboration to see a list of patients.

Users must have access to a data set to add it to a sample group. Users are not required to have access to the data sets in a sample group in order to view the genomic data of the samples in a sample group. This allows users to share specific samples from a data set without sharing the whole thing.
