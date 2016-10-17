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
library(vioplot)
x = read.table(args[1], na.strings = c('undefined','null','NA'), header = TRUE, row.names = 1, check.names=FALSE, stringsAsFactors=FALSE)

genes= args[3]
genes
eval(parse(text=args[[3]]))
length(genes)
genes
pdf(args[4])
#for(gene in 1:length(genes)) 
    y=x[1,]
    contrast = read.delim(args[2], header = TRUE, row.names = 1, check.names=FALSE, stringsAsFactors=FALSE)
    u = intersect(colnames(y), rownames(contrast))
    contrast1 = contrast[u, ]
    f<-factor(contrast1)
    n <- names(table(f))
    y_t = t(y[, u])
    axis_labels =list() 
    length(genes)
    if (length(genes) == 1) {
        axis_labels[1] = paste(genes[1], n[1])
        axis_labels[2] = paste(genes[1], n[2])
    }

    if (length(genes) >= 2) {
        y2=x[2,]
        u2 = intersect(colnames(y2), rownames(contrast))
        y_t2 = t(y2[, u2])
        contrast2 = contrast[u2, ]

        f2<-factor(contrast2)
        n <- c(names(table(f)), names(table(f2)))
    }
    if (length(genes) >= 3) {
        y3=x[3,]
        u3 = intersect(colnames(y3), rownames(contrast))
        y_t3 = t(y3[, u3])
        contrast3 = contrast[u3, ]

        f3<-factor(contrast3)
        n <- c(names(table(f)), names(table(f2)), names(table(f3)))
    }
    if (length(genes) >=2) {
        for(i in 1:length(genes)) {
            j = 2*(i-1)
            paste(genes[i], n[1])
            axis_labels[j+1] = paste(genes[i], n[1])
            axis_labels[j+2] = paste(genes[i], n[2])
        }
    }
    if (length(genes)==1) {
        axis_labels
        vioplot(y_t[contrast1==names(table(f))[1],],y_t[contrast1==names(table(f))[2],], names=axis_labels)
    }
    if (length(genes)==2) {
        vioplot(y_t[contrast1==names(table(f))[1],],y_t[contrast1==names(table(f))[2],] ,y_t2[contrast2==names(table(f))[1],],y_t2[contrast2==names(table(f))[2],],names=axis_labels)
    }
    if (length(genes)==3) {
        vioplot(y_t[contrast1==names(table(f))[1],],y_t[contrast1==names(table(f))[2],] ,y_t2[contrast2==names(table(f))[1],],y_t2[contrast2==names(table(f))[2],],y_t3[contrast3==names(table(f))[1],],y_t3[contrast3==names(table(f))[2],], names=axis_labels)
    }
    dev.off()
svg(args[5])
    if (length(genes)==1) {
        vioplot(y_t[contrast1==names(table(f))[1],],y_t[contrast1==names(table(f))[2],], names=axis_labels)
    }
    if (length(genes)==2) {
        vioplot(y_t[contrast1==names(table(f))[1],],y_t[contrast1==names(table(f))[2],] ,y_t2[contrast2==names(table(f))[1],],y_t2[contrast2==names(table(f))[2],],names=axis_labels)
    }
    if (length(genes)==3) {
        vioplot(y_t[contrast1==names(table(f))[1],],y_t[contrast1==names(table(f))[2],] ,y_t2[contrast2==names(table(f))[1],],y_t2[contrast2==names(table(f))[2],],y_t3[contrast3==names(table(f))[1],],y_t3[contrast3==names(table(f))[2],], names=axis_labels)
    }
dev.off()
