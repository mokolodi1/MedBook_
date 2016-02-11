#!/bin/bash

# ./POG079.txt: gene expression for that one sample
join -1 1 ./highthreshold.txt ./lowthreshold.txt | join -1 1 - ./test_sample_gene_expression.txt > temp
awk '($3>$4){print $1, $4, "down_outlier"}' temp > expression_down_outliers.tsv
awk '($2<$4){print $1, $4, "up_outlier"}' temp > expression_up_outliers.tsv
