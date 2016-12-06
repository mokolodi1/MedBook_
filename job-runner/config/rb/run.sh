export MONGO_URL="mongodb://localhost:27017/MedBook"
export MEDBOOK_FILESTORE=/tmp/filestore

meteor --port 3004 --settings ../config/rb/settings.json
