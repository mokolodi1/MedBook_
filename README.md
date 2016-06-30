# Blobs

This package allows for easy storage of blobs on the filesystem.

## Getting started

### Installation

This package is not currently published to Atmosphere.

```sh
cd webapp/packages
git submodule add https://github.com/UCSC-MedBook/blobs
```

### Setup

Before using blobs, you must first configure the package.

##### Example setup code

```js
Blobs.configure({
  storageRootPath: "/filestore",
});
```

##### Configuration fields

| Field name               | Description |
|--------------------------|-------------|
| `filesPerFolder`         | Maximum number of files per folder. Defaults to 10000 |
| `storageRootPath`        | Path to root of where to store files. |

The maximum number of files stored in the system is `Math.pow(filesPerFolder, 2)`.

### Usage

#### Insert

Inserting a blob on the server will move the original file!

`Blobs.create(pathToFileOnServer, associatedObject, callback)`, where `pathToFileOnServer` is the path of the file on the server and `associatedObject` is the object the blob is associated with. `associatedObject` is an object with the fields `collection_name` and `mongo_id`.

```js
let blobId = Blobs.create("/path/to/file/on/server", {
  collection_name: "Jobs",
  mongo_id: "YDcb7YWfXTdjXbSKX"
}, function (err, result) {
  // code
});
```

### Internal documentation

One `BlobMetadata` object is created for every leaf folder that is created.

- Internal documentation
  - BlobMetadata
