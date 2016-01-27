#!/bin/bash

# arg 1: matrix file
# arg 2: default 1.5
/usr/bin/Rscript outlier.R mRNA.NBL.POG.pancan.combat.5.tab 2

# ./POG079.txt: gene expression for that one sample
join -1 1 ./highthreshold.txt ./lowthreshold.txt | join -1 1 - ./POG079.txt > temp
awk '($3>$4){print $1, $4, "down_outlier"}' temp > expression_down_outliers.tsv
awk '($2<$4){print $1, $4, "up_outlier"}' temp > expression_up_outliers.tsv
