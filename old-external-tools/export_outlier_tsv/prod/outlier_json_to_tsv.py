import sys
import json
import csv

def main():
  print("start")
  with open("result.json") as inp:
    data = json.load(inp)
    samp = data["args"]["sample_label"].split("/")
    if(len(samp) == 1):
      samplename = samp[0]
    else:
      samplename = samp[1]
    with open(("%s.tsv" % samplename), "w") as out:
      print >>out,"SAMPLE: %s" % samplename
      print >>out,"BACKGROUND: %s" % data["args"]["sample_group_name"]
      print >>out,"IQR: %s" % data["args"]["iqr_multiplier"]
      writer = csv.writer(out, delimiter="\t",lineterminator="\n")
      writer.writerow(["feature_label", "sample_value", "background_median", "outlier_status"])
      upgenes = data["output"]["up_genes"]
      for obj in upgenes:
        writer.writerow([obj["gene_label"],obj["sample_value"],obj["background_median"],"UP"])
      downgenes = data["output"]["down_genes"]
      for obj in downgenes:
        writer.writerow([obj["gene_label"],obj["sample_value"],obj["background_median"],"DOWN"])

  print("done")



if __name__ == "__main__" :
  main()
   
