import sys
import json
import csv

def addOutlierCol(arr, topGenesArray):
  if (arr[0] in topGenesArray):
    arr.append("TOP 5%")
    topGenesArray.remove(arr[0])
    print("after removal:", str(len(topGenesArray)))

def main():
  print("start")
  with open("result.json") as inp:
    data = json.load(inp)
    samp = data["args"]["sample_label"].split("/")
    background = data["args"]["sample_group_name"]
    iqr = data["args"]["iqr_multiplier"]
    if(len(samp) == 1):
      samplename = samp[0]
    else:
      samplename = samp[1]
    # add iqr and background 
    # clean up the background
    bg_filename = "".join(x for x in background if x.isalnum())
    with open(("%s_vs_%s_iqr_%s.tsv" % (samplename, bg_filename, iqr)), "w") as out:
      print >>out,"SAMPLE: %s" % samplename
      print >>out,"BACKGROUND: %s" % data["args"]["sample_group_name"]
      print >>out,"IQR: %s" % data["args"]["iqr_multiplier"]
      writer = csv.writer(out, delimiter="\t",lineterminator="\n")
      writer.writerow(["feature_label", "sample_value", "background_median", "outlier_status"])

      topFivePercentGenes = data["output"]["top5percent_genes"];
      topGenesArray = [x["gene_label"] for x in topFivePercentGenes]

      upgenes = data["output"]["up_genes"]
      for obj in upgenes:
        arr = [obj["gene_label"],obj["sample_value"],obj["background_median"],"UP"]
        addOutlierCol(arr, topGenesArray)
        writer.writerow(arr)
      downgenes = data["output"]["down_genes"]
      for obj in downgenes:
        arr = [obj["gene_label"],obj["sample_value"],obj["background_median"],"DOWN"]
        addOutlierCol(arr, topGenesArray)
        writer.writerow(arr)

      for obj in topFivePercentGenes:
        if (obj["gene_label"] in topGenesArray):
          writer.writerow([obj["gene_label"],obj["sample_value"],"","", "TOP 5%"])

  print("done")



if __name__ == "__main__" :
  main()
