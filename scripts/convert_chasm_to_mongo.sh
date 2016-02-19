#
grep  "Input line" Variant.Result.tsv |sed -f chasm_header.sed  > header
grep -v "Input line" Variant.Result.tsv > temp
cat header temp |cut -f2-15,17-19| tr -d '\r' | awk -F'\t' 'NR==1{OFS="\t";print $0,"mutation_caller","biological_source","mutation_impact_assessor", "mutation_type"}NR!=1 && $12 <= 0.25 && $12 != ""{OFS="\t";print $0,"MuTect","DNA","CHASM","SNP"}' |sed -f chasm_data.sed> Variant.final.tsv
mongoimport --type tsv --headerline -d MedBook -c mutations < Variant.final.tsv
mongo MedBook --eval 'db.mutations.update({"drug_target":""},{$unset:{"drug_target":1}},{multi:1})'
mongo MedBook --eval 'db.mutations.update({"driver_type":""},{$unset:{"driver_type":1}},{multi:1})'

