# Blobs

This package allows for easy storage of blobs on the filesystem.

## Getting started

### Installation

This package is not currently published to Atmosphere.

```sh
cd webapp/packages
git submodule add https://github.com/UCSC-MedBook/blobs
```

### Usage

#### Insert

Inserting a blob on the server will move the original file!

`Blobs.create(pathToFileOnServer, associatedObject, metadata, callback)`

- `pathToFileOnServer`: the path of the file on the server
- `associatedObject`: the object the blob is associated with. This is an object with the fields `collection_name` and `mongo_id`.
- `metadata`: any needed uniquely identifying information (any Object)

```js
let blobId = Blobs.create("/path/to/file/on/server", {
  collection_name: "Jobs",
  mongo_id: "YDcb7YWfXTdjXbSKX"
}, {}, function (err, result) {
  // code
});
```

### Internal documentation

Blobs are stored at `/filestore`, but this can be overridden by setting `MEDBOOK_FILESTORE` in environment.

Within that folder, they are stored two folders down, according to the mongo `_id`. If the mongo `_id` is "abcdefg", the full storage path will be "/filestore/ab/cd/abcdefg".
