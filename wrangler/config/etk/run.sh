export MONGO_URL="mongodb://localhost:27017/MedBook"
export MEDBOOK_FILESTORE=/tmp/filestore
export PACKAGE_DIRS=../../packages

if [ -z "$1" ]; then
    meteor --port 3002
else
    meteor $1 --port 3002
fi
