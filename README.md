# MedBook_

[![Build Status](https://travis-ci.org/UCSC-MedBook/MedBook_.svg?branch=master)](https://travis-ci.org/UCSC-MedBook/MedBook_) Master

[![Build Status](https://travis-ci.org/UCSC-MedBook/MedBook_.svg?branch=patientcare-add-tests)](https://travis-ci.org/UCSC-MedBook/MedBook_) Patient-Care

To build in docker and run (Currently: wrangler + jobrunner):
~~~~
  git clone https://github.com/UCSC-MedBook/medbook_.git
  git checkout jobrunner-add-tests 

  docker-compose -f docker-compose-build.yml build
  docker-compose -f docker-compose-mongo.yml up -d

  ./prodStart.sh
~~~~

