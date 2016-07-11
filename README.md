# MedBook Primary Collections

This package declares the base genomic and clinical collections required for MedBook.

### Utility functions

These functions are defined under `MedBook.utility`

| Function | Description |
|-|-|
| `sampleObjToStr()` | Takes a sample object (`{ study_label, sample_label }`) and returns a fully qualified sample string (`"STUDY/SAMPLE"`). |
| `sampleStrToObj()` | Takes a fully qualified sample string (`"STUDY/SAMPLE"`) and returns a sample object (`{ study_label, sample_label }`). |
| `sampleArrObjToStr()` | Maps `sampleObjToStr` to an array. |
| `sampleArrStrToObj()` | Maps `sampleStrToObj` to an array. |
