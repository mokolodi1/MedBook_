export MONGO_URL="mongodb://localhost:27017/MedBook"
export MEDBOOK_FILESTORE=/tmp/filestore

echo meteor --port 3001 --settings ../config/rb/settings.json
meteor --port 3001 --settings ../config/rb/settings.json
