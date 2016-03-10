
#!/usr/bin/Rscript
args <- commandArgs(TRUE)
#read compendium from file
df <- read.table(args[1], header = TRUE, row.names=1, sep ="\t")
qq<-data.frame(apply(df, 1,quantile))
iqr <- data.frame(apply(df, 1, na.rm=T, IQR))
qq.3 <- t(qq[4,])
qq.1 <- t(qq[2,])
x<-args[2]
high.threshold<-data.frame(qq.3 + x*iqr)
low.threshold<-data.frame(qq.1- x*iqr)
write.table(high.threshold, file="./highthreshold", sep=" ", row.names = TRUE, col.names = TRUE)
write.table(low.threshold, file="./lowthreshold", sep=" ", row.names = TRUE, col.names = TRUE)
q(status=<exit status code>)
