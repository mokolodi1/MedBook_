# MedBook Primary Collections

This package declares the base genomic and clinical collections required for MedBook.

The naming conventions and style guide here are relevant for all MedBook collections.

## Naming conventions

Mongo collection names should be snake case. Meteor collection names should be camel case and begin with a capital letter.

```js
import { Mongo } from 'meteor/mongo'

CollectionName = new Mongo.Collection("collection_name");
```

Attribute names should be snake case and should be descriptive. When representing the same data type across collections, the same attribute name should be used.

## General

Collections are accessible either through their Meteor collection name (ex. `CollectionName`) or through `MedBook.collections` (ex. `MedBook.collections.CollectionName`).

## Collections

### Studies



<!-- ## Signature score workflow

1. A contrast is imported using Wrangler.
2. The contrast is used to train a signature.
3. The signature is used to generate signature scores for samples.  -->
