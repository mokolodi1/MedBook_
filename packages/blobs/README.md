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

Blobs can be created using `Blobs2.create`, which returns a Promise.

Inserting a blob on the server will move the original file!

`Blobs2.create(pathToFileOnServer, associatedObject, metadata, callback)`

- `pathToFileOnServer`: the path of the file on the server
- `associatedObject`: the object the blob is associated with. This is an object with the fields `collection_name` and `mongo_id`.
- `metadata`: any needed uniquely identifying information (any Object)

```js
let blobId = Blobs2.create("/path/to/file/on/server", {
  collection_name: "Jobs",
  mongo_id: "YDcb7YWfXTdjXbSKX"
}, {}, function (err, result) {
  // code
});
```

#### Delete

Blobs can be deleted using `Blobs2.delete`, which takes a selector and returns
a Q.Promise. Calling `Blobs2.delete` will also delete the files on disk.

```js
let associated_object = {
  collection_name: "Jobs",
  mongo_id: "7bcYtNJx4G3NpEtCn",
}

Blobs2.delete({ associated_object }, (err, deletedCount) => {
  if (err) {
    console.log("Error deleting blobs!");
  }
});
```

### Internal documentation

Blobs are stored at `/filestore`, but this can be overridden by setting `MEDBOOK_FILESTORE` in environment.

Within that folder, they are stored two folders down, according to the mongo `_id`. If the mongo `_id` is "abcdefg", the full storage path will be "/filestore/ab/cd/abcdefg".
