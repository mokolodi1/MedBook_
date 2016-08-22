# Teo's weekend experiment

## Goals

#### Create forms

Be able to create a new form from scratch.

#### Create records

Be able to create a new record for a given data set from scratch.

#### Update records

Be able to update existing records.

## Collections

As a general note, the `name` attribute in any collection is not unique.

#### Data sets

A data set is a set of genomic data that makes sense together. In some cases, a data set will contain information from many different patients, as is the case with WCDT. In other cases, a data set will contain the information for a single patient, as is the case with CKCC.

#### Forms

Forms store the schema for clinical report forms. Forms have collaboration security. Forms can be either patient-level or sample-level. (These fields are implied and are generated automatically in the form.)

#### Records (Reports?)

A record is an instance of a form. A record is data-set specific and can contain patient or sample-level data. Each record follows the schema of it's form. Records have collaboration security. A record's collaborations can be totally different from those of the form they are related to.

## Random documentation

`MedBook.schemaObjectFromForm` generates a schema object for the `values` object in a record. Use `new SimpleSchema(MedBook.schemaObjectFromForm(form))` to create a SimpleSchema.
