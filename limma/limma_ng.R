#! /usr/bin/Rscript --vanilla 
usage <- "\nusage: limma_ng input contrast top_count output.tab top_output.tab out.pdf"
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
x = read.table(args[1], header = TRUE, row.names = 1, check.names=FALSE, stringsAsFactors=FALSE)
contrast = read.delim(args[2], header = TRUE, row.names = 1, check.names=FALSE, stringsAsFactors=FALSE)
u = intersect(colnames(x), rownames(contrast))
length(u)

x = x[, u]
dim(x)
rownames(contrast)
contrast = contrast[u, ]
length(contrast)
colnames(x)

dge = DGEList(counts=x)
isexpr = rowSums(cpm(dge) > 10) >= 2
flt = dge[isexpr,]
tmm = calcNormFactors(flt)
design = model.matrix(~ contrast)
y = voom(tmm, design, plot=TRUE)
pdf(args[6])
plotMDS(y,top=50,labels=contrast, col=ifelse(contrast=="SmallCell","blue","red"),gene.selection="common")
dev.off()

fit = eBayes(lmFit(y, design))
cn = sprintf("contrast%s", as.character(levels(as.factor(contrast))[2]))
cn
args[3]
tt = topTable(fit, coef=cn, number=as.numeric(args[3]))
limma_out = list(design=design, y=y, fit=fit, tt=tt)
out_data = args[4]
out_top = args[5]
write_matrix( limma_out$fit, out_data)
write_matrix( tt, out_top)

