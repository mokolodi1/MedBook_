import sys
import json

# Given file fix_these_samplegroups
# make new samplegroups that are the same
# except old_dataset replaced by new_dataset
# and print
# with additional javascript code to write them to the database

def print_make_sg(data):
  obj = json.dumps(data)
  print(obj + ",")

def main():
    
  # print the beginning of the samplegroup list
  print("var sgroups = [")

  # print each samplegroup
  
  new_dataset_id = sys.argv[1]
  old_dataset_id = sys.argv[2]

  with open("fix_these_samplegroups") as inp:
    for line in inp:
      data = json.loads(line)
      newdata = {}
      newdata["name"] = data["name"]
      newdata["version"] = data["version"]
      newdata["collaborations"] = data["collaborations"]
      newdata["data_sets"] = []
      # Go through datasets, update ID to new if it's the old one
      # and leave it the same otherwise
      for dataset in data["data_sets"]:
        new_ds = {}
        new_ds["filters"] = dataset["filters"]
        from_ds_id = dataset["data_set_id"]
        if from_ds_id == old_dataset_id:
          new_ds["data_set_id"] = new_dataset_id
        else:
          new_ds["data_set_id"] = from_ds_id
        newdata["data_sets"].append(new_ds)
      # output the sample group
      print_make_sg(newdata)

  # print the rest of it
  remaining_contents = """]
  for( item of sgroups){
    Meteor.call("createSampleGroup", item, (e,r) => {
      if(e){console.log("ERROR ",e);}
      else{console.log("RAN ",r);} 
    });
  }
"""
  print(remaining_contents)

if __name__ == "__main__" :
  main()
