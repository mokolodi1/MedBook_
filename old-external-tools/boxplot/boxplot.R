#! /usr/bin/Rscript --vanilla 
usage <- "\nusage: boxplot input contrast genes out.pdf"
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
genes= args[3]
y=x[genes,]
contrast = read.delim(args[2], header = TRUE, row.names = 1, check.names=FALSE, stringsAsFactors=FALSE)
u = intersect(colnames(y), rownames(contrast))
length(u)

y_t = t(y[, u])
dim(y)
rownames(contrast)
contrast = contrast[u, ]
length(contrast)
message('contrast',contrast)

ttest <- t.test(y_t~contrast)
names(ttest)
pdf(args[4])
boxplot(y_t~contrast)
stripchart(y_t~contrast,method="jitter",jitter=.05,vertical=T,add=T) 
title(paste('expression of ',genes, 'p-value of Welsh two sample t-test',round(ttest$p.value, digits=4)))
dev.off()

svg(args[5])
boxplot(y_t~contrast)
stripchart(y_t~contrast,method="jitter",jitter=.05,vertical=T,add=T) 
title(paste('expression of ',genes, 'p-value of Welsh two sample t-test',round(ttest$p.value, digits=4)))
dev.off()
