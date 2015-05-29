#! /usr/bin/Rscript --vanilla
usage <- "\nusage: nmf_cluster exp_data clinical max_sd min_rank max_rank out.Rdata out.pdf"
library(NMF)
library("Biobase")
library(convert)
args <- commandArgs(TRUE)
#dataDirectory <- system.file("/Users/robertbaertsch/src/meteor/scripts", package="Biobase")
exprsFile <- args[1]
#phenoFile <- file.path(dataDirectory, "/Users/robertbaertsch/src/meteor/scripts/WCDT_histology_May2015.tab");
phenoFile <- args[2]
max_sd <- args[3]
min_rank <- args[4]
max_rank <- args[5]
outfile_R <- args[6]
outfile_pdf <- args[7]
#exprs <- as.matrix(read.table(exprsFile, header=TRUE, sep="\t",row.names=1, as.is=T, stringsAsFactors=F,check.names=F))
read_matrix <- function(in_file){
  header <- strsplit(readLines(con=in_file, n=1), "\t")[[1]]
  cl.cols<- 1:length(header) > 1
  data_matrix.df <- read.delim(in_file, header=TRUE, row.names=NULL, stringsAsFactors=FALSE, na.strings=
  "NA", check.names=FALSE)
  data_matrix <- as.matrix(data_matrix.df[,cl.cols])
  rownames(data_matrix) <- data_matrix.df[,1]
  return(data_matrix)
}
exprs = as.matrix(read.table(exprsFile, na.strings = c('undefined','null','NA'), header = TRUE, row.names = 1, check.names=FALSE, stringsAsFactors=FALSE))
pData <- read.table(phenoFile, row.names=1, header=TRUE, sep="\t")
all(rownames(pData)==colnames(exprs))
length(rownames(pData))
length(colnames(exprs))
pData <- read.table(phenoFile,row.names=1, header=TRUE, sep="\t")
pData<-pData[,1:4]
all(rownames(pData)==colnames(exprs))
pData[1,]
metadata <- data.frame(labelDescription=c("Histology","Small Cell or Not", "Small Cell + IAC vs Not", "SC or IAC or Adeno"),row.names=c("Histology","Small.Cell","Adeno", "Trichotomy"))
phenoData <- new("AnnotatedDataFrame",data=pData, varMetadata=metadata)
exampleSet <- ExpressionSet(assayData=exprs,phenoData=phenoData)
wcdt <- ExpressionSet(assayData=exprs,phenoData=phenoData)
ind <- apply(exprs, 1, function(x) sd(x<max_sd))
summary(ind)
exprs <- exprs[!ind,]
dim(exprs)
wcdt <- ExpressionSet(assayData=exprs,phenoData=phenoData)
wcdt_nmf <- nmf(wcdt, min_rank:max_rank, nrun=10, seed=123456)
pdf(outfile_pdf)
consensusmap(wcdt_nmf, annCol=wcdt$Adeno, labCol = NA, labRow = NA)
save(outfile_R)
dev.off()
