//var MongoClient = require('mongodb').MongoClient;
//var async = require('async');
var fs = require("fs");
//var $ = jQuery = require("jquery");
var infile = "output/TCGA_PRAD_xena/HiSeqV2";
var studyID = 'prad_tcga';
//var ObjectID = require('mongodb').ObjectID
//var database = 'MedBook'
//var connect_string = 'mongodb://127.0.0.1:27017/'+database

//MongoClient.connect(connect_string, {fsync: true}, function(err, db) {
//    var collection_name = 'expression3'
//    var collection = db.collection(collection_name);
    var text = []; 
    var header = []
//    if(err) throw err;
//    whendone = function(err, docs) {
//        if (err) {
//            console.log('error upserting', err)
//        }
//	else {
//		console.log('upserting ok', docs)
//	}
//    }
    fs.readFile(infile, "UTF-8", function(err, text) {
            if(err) throw err;
            row = text.split('\n')
            var arrayLength = row.length;
	    console.log('number of rows ', arrayLength);
            var samples = [];
            var dataArr = [];
            for (var i = 0; i < arrayLength; i++) {
                var data = {};
                cols = row[i].split('\t')
                var numsamples = cols.length - 1;
                var gene = cols[0];
                //console.log('#row',i,numsamples, row[i])
                console.log('#row',i,numsamples,cols.join(','))
		console.log('gene', gene, 'i', i, 'num samples', numsamples)
                if (gene) {
                  for (var j = 0 ; j < numsamples; j++) {
                    if (i == 0){
                        //console.log('header',j, cols[j])
                        header[j] = cols[j]
                        samples[j-1] = cols[j]
                    }
                    else {
                        if (j == 0) {
                            data['gene_label'] = gene
                            data['study_label'] = studyID
                        }
                        else {
                            sample = header[j]
                        }
                    }
		  }
                data['rsem_quan_log2'] = cols.slice(1,numsamples).join(',')
                  //data['_id'] = new ObjectID()
                  //data['Study_ID'] = studyID
                  //data['Collaborations'] = [studyID]
                  //data['samples'] = samples;
                  console.log('insert ',i,gene);
                  if (i > 0) {
		      if (gene === 'AR') {
			      console.log('#insert ', data)
			}

                      console.log('data', data)
                      dataArr.push(data);
                    //  printjson(data);
                //      collection.insert(data, function(err, docs) {
		//		if (err) {
		//		    console.log('error updating', err)
		//		}
		//		else {
		//		    console.log('insert returns ', docs)
		//		}
		//	})
                  }
   		  else {
		      console.log('header - no insert ');
		  }
                }
                }
            fs.writeFile('studies.json', JSON.stringify(samples), function (err) {
                      if (err) return console.log(err);
                        console.log('writing to studies.json');
                        });
            fs.writeFile('expression3.json', JSON.stringify(dataArr), function (err) {
                      if (err) return console.log(err);
                        console.log('writing to expression3.json');
                        });
            })
	    //console.log('close db')
            //db.close()
    //})
//})
