 cd /data/home/chrisw/medbook_stuff/wcdt_mutation
 for i in `ls *mutect*` ; do echo $i ; grep -v REJECT $i > ~galaxy/wcdt_mutation/$i ; done
 for i in `ls *muse*` ; do echo $i ; grep -v REJECT $i > ~galaxy/wcdt_mutation/$i ; done
 cd ~galaxy/wcdt_mutation
 for i in `ls *.mutect.vcf` ; do awk -v f=${i%%.mutect.vcf} -F'\t' 'NF!=11{print $0}NF==11 && $1=="#CHROM"{print $0}NF==11 && $1!="#CHROM"{OFS="\t";print f"
_"NR,$1,$2,"+",$4,$5,f}' $i > ${i%%.mutect.vcf}.cravat ; done
