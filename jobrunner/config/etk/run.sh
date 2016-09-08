export MONGO_URL="mongodb://localhost:27017/MedBook"
export MEDBOOK_FILESTORE=/tmp/filestore
export PACKAGE_DIRS=../../packages

meteor --port 3003 --settings ../config/etk/settings.json
