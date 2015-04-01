#!/usr/bin/env python
"""
medbookAdapterViolinplot.py
    by Robert Baertsch
"""
import logging, math, os, random, re, shutil, sys, types, zipfile
from copy import deepcopy

from optparse import OptionParser

## logger
logging.basicConfig(filename = "medbook-violinplot.log", level = logging.INFO)

## executables
print "startup" 
bin_dir = os.path.dirname(os.path.abspath(__file__))
print "bindir ", bin_dir
R_exec = os.path.join(bin_dir, "violinplot.R")
print "R_exec ", R_exec

## functions
def zipDirectory(directory, zip):
    for root, dirs, files in os.walk(directory):
        for file in files:
            zip.write(os.path.join(root, file))

def main():
    print "start"
    
    ## parse arguments
    parser = OptionParser(usage = "%prog [options] data_matrix contrast output.pdf output.svg")
    parser.add_option("-t", "--top", dest = "top_genes", default = 200,
                      help = "number of genes to keep in diffential analysis")
    parser.add_option("-p", "--plot", dest = "plot_genes", default = 50,
                      help = "number of genes to plot in MDS")
    parser.add_option("--oz", "--output-zip", dest = "output_zip", default = None,
                      help = "output files into a zipfile")
    parser.add_option("-s", "--output-signature", dest = "output_signature", default = None,
                      help = "output signature file")
    options, args = parser.parse_args()
    logging.info("options: %s" % (str(options)))
    
    work_dir = os.path.abspath("./")
    
    print "work _dir", work_dir, "num args", len(args)
    if len(args) != 5:
        logging.error("ERROR: incorrect number of arguments\n")
        sys.exit(1)
    data_file = os.path.abspath(args[0])
    phenotype_file = os.path.abspath(args[1])
    genes = args[2].split(',')
    print "#GENES: ", genes
    #quoted_genes = []
    gene_list = ""
    for g in genes:
        gene_list = gene_list + '"'+g.replace('[','').replace(']','')+'"'+','
    print "#after Genelist: ", gene_list[0:-1]
    pdf_file = os.path.join(work_dir, "report", args[3])
    svg_file = os.path.join(work_dir, "report", args[4])
    try:
        os.mkdir(os.path.join(work_dir,"report"))
    except:
        shutil.rmtree(os.path.join(work_dir,"report"))
        os.mkdir(os.path.join(work_dir,"report"))
    
    cmd = "Rscript %s" % ( R_exec)
    cmd += " %s %s" % (data_file, phenotype_file)
    cmd += " 'genes=c(%s)'"  % gene_list[0:-1]
    cmd += " %s " % (pdf_file)
    cmd += " %s " % (svg_file)
    print "cmd ",cmd
    os.system(cmd)
    logging.info("system: %s" % (cmd))
    
    
    ## prepare outputs
    report_dir = "report"
    if options.output_zip is not None:
        zip_file = zipfile.ZipFile("report.zip", "w")
        zipDirectory(report_dir, zip_file)
        zip_file.close()
        shutil.copy(os.path.join(work_dir, "report.zip"), options.output_zip)
    print "work_dir", work_dir
    from os import listdir
    from os.path import isfile, join
    onlyfiles = [ f for f in listdir(report_dir) if isfile(join(report_dir,f)) ]
    outlist = open('report.list', 'w')
    for f in onlyfiles:
        file = os.path.join(work_dir, "report", f)
        outlist.write(file)
        outlist.write('\n')
    outlist.close()
        
    print "reports", onlyfiles



if __name__ == "__main__":
    main()
