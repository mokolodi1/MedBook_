#
#usage: python htmlFG.py ipl_directory pathway_directory pathway_pids.tab
#               ipl_directory contains one IPL matrix per pathway
#               pathway_directory contains one spf file per pathway
#               pathway_pids.tab is a 3 col file with list of pathways in pathway_directory: pid, description, source
#               Note: pathway names must start with pid_ and end with _pathway.tab
export PYTHONPATH=/usr/lib64/python2.6/site-packages:/usr/local/lib64/python2.7/site-packages:/data/packages/py-lib:/usr/local/lib64/python2.7/site-packages/:/data/medbook-galaxy-central/tools/paradigm/paradigm-scripts:/data/packages/py-lib:/usr/local/lib/python2.7/site-packages:/usr/lib/python2.7/site-packages/:/data/packages:/data/medbook/tools/pathmark-scripts/bin:/data/packages/pathway_tools/pathway_tools:

python htmlFG.py $1 $2 $3 input/small_cell_pheno.tab "Small Cell" "Adeno" $4
