import csv
from pymongo import MongoClient
client = MongoClient('localhost', 27017)
inputfile = "Subject Followup Report by Protocol.csv"
db = client.MedBook
collection = db.clinical_oncore
with open(inputfile, 'rb') as csvfile:
     csvreader = csv.reader(csvfile, delimiter=',', quotechar='"')
     for row in csvreader:
         #print "length",len(row), row[0], 
         patient = "DTB-"+row[0]
         if (row[9]):
            print patient, "expired date", row[9], 
            collection.update({'patient':patient}, {"$set": {'attributes.Followup.Expired Date': row[9]}}, upsert=False)
         if (row[10]):
            print patient, "last date known alive", row[10],
            collection.update({'patient':patient}, {"$set": {'attributes.Followup.Last Date Known Alive': row[10]}}, upsert=False)
         print
         #print ', '.join(row)
