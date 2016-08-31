August 29, 2016

A hacked-together script for quickly creating a TSV of outlier analysis
results & uploading to the Treehouse directory.

Not "production quality".

Must be run by someone with ssh access to both the production server and the 
Treehouse directory.

What it does:
============
Connects to production server
Pulls the requested outlier job results out of the database
Uses a python script to convert it to a custom tsv format
Using SFTP, downloads that tsv
Using SFTP, reuploads that tsv to the Treehouse directory.


Installation:
==============
On prod:
====
- have python 2.7 installed
- put everything in the 'prod' folder in a folder somewhere
  - the laptop script assumes it's located at ~/prod

On your laptop:
====
 - put run_maketab.sh in a folder somewhere
 - make an "already_transferred" subfolder
 - replace the values in run_maketab.sh as appropriate

Usage:
======
  ./run_maketab.sh MONGO_ID.





