#! /usr/bin/Rscript --vanilla 
usage <- "\nusage: limma_ng input contrast top_count correction_BH_or_none output.tab top_output.tab out.pdf"
library(edgeR)
library(limma)
args <- commandArgs(TRUE)

write_matrix <- function(data_matrix, file){
	header <- append(c("samples"), colnames(data_matrix))
	if(is.null(colnames(data_matrix)) || length(colnames(data_matrix))==1)
	{
		header <- c("samples", "corr")
	}
	write.table(t(header), file, quote=FALSE, sep="\t", row.names=FALSE, col.names=FALSE)
	write.table(data_matrix, file, quote=FALSE, sep="\t", row.names=TRUE, col.names=FALSE)
}
x = read.table(args[1], na.strings = c('undefined','null','NA'), header = TRUE, row.names = 1, check.names=FALSE, stringsAsFactors=FALSE)
contrast = read.delim(args[2], header = TRUE, row.names = 1, check.names=FALSE, stringsAsFactors=FALSE)
u = intersect(colnames(x), rownames(contrast))
length(u)

x = x[, u]
dim(x)
rownames(contrast)
contrast = contrast[u, ]
length(contrast)
colnames(x)

allzero <- colSums(x > 0, na.rm=TRUE) == 0
print (c('all zero', allzero))
dge = DGEList(counts=x)
#print (c('DGEList returns: ',dge[1:3,1:3]))
#print (c('rowSums(count per million(dge) ) returns: ',rowSums(cpm(dge[1:4,]), na.rm=TRUE) ))
isexpr = rowSums(cpm(dge) > 10, na.rm=TRUE) >= 2
#print (c('rowSums(cpm(dge) > 10) >= 2 returns: ',isexpr[1:10]))
flt = dge[isexpr,]
#print (c('dge returns',flt[1:3,1:3]))
tmm = calcNormFactors(flt)
#print (c('calcNormFactors returns tmm: ',tmm$counts[1:3,], tmm$samples))
design = model.matrix(~ contrast)
#print (c('model.matrix(~contrast) returns design: ',design))
y = voom(tmm, design, plot=TRUE)
#print (c('voom returns', y[1:3]))
pdf(args[7])
plotMDS(y,top=50,labels=contrast, col=ifelse(contrast==contrast[1],"red","blue"),gene.selection="common")
dev.off()

fit = eBayes(lmFit(y, design))
cn = sprintf("contrast%s", as.character(levels(as.factor(contrast))[2]))
cn
args[3]
tt = topTable(fit, coef=cn, number=as.numeric(args[3]), adjust.method=args[4], sort.by = "logFC")
limma_out = list(design=design, y=y, fit=fit, tt=tt)
out_data = args[5]
out_top = args[6]
write_matrix( limma_out$fit, out_data)
write_matrix( tt, out_top)

