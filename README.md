# MedBook Primary Collections

This package declares the base genomic and clinical collections required for MedBook.

### Utilities

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
