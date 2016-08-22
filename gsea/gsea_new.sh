#
EXP=$1
PHENO=$2
GENESET=$3
#    Class seperation metric - gene markers are ranked using this metric to produce the gene list
#    Metric values  : Signal2Noise,tTest,Cosine,Euclidean,Manhatten,Pearson,Ratio_of_Classes,Diff_of_Classes,log2_Ratio_of_Classes
METRIC=$4
#default 500
MAX=$5
#default 15
MIN=$6
#plot top x gene sets
TOP=$7
java -Xmx6G -cp ~/src/MedBook/external-tools/gsea/gsea2-2.2.2.jar xtools.gsea.Gsea -gmx $GENESET -gui false -make_sets true -rnd_seed timestamp -norm meandiv -zip_report true -scoring_scheme weighted -out . -set_max $MAX -set_min $MIN -mode Max_probe -collapse false -nperm 1000 -rpt_label GSEAreport -plot_top_x $TOP -res $EXP -cls $PHENO -metric $METRIC
