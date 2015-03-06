#!/usr/bin/env python
"""
medbookAdapterBoxplot.py
    by Robert Baertsch
"""
import logging, math, os, random, re, shutil, sys, types, zipfile
from copy import deepcopy

from optparse import OptionParser

## logger
logging.basicConfig(filename = "medbook-boxplot.log", level = logging.INFO)

## executables
print "startup" 
bin_dir = os.path.dirname(os.path.abspath(__file__))
print "bindir ", bin_dir
R_exec = os.path.join(bin_dir, "boxplot.R")
print "R_exec ", R_exec

## functions
def zipDirectory(directory, zip):
    for root, dirs, files in os.walk(directory):
        for file in files:
            zip.write(os.path.join(root, file))

def main():
    print "start"
    
    ## parse arguments
    parser = OptionParser(usage = "%prog [options] data_matrix contrast ")
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
    
    if len(args) != 4:
        logging.error("ERROR: incorrect number of arguments\n")
        sys.exit(1)
    data_file = os.path.abspath(args[0])
    phenotype_file = os.path.abspath(args[1])
    genes = args[2]
    pdf_file = os.path.join(work_dir, "report", args[3])
    try:
        os.mkdir(os.path.join(work_dir,"report"))
    except:
        shutil.rmtree(os.path.join(work_dir,"report"))
        os.mkdir(os.path.join(work_dir,"report"))
    
    cmd = "Rscript %s" % ( R_exec)
    print "cmd", cmd
    cmd += " %s %s" % (data_file, phenotype_file)
    cmd += " %s "  % (genes)
    cmd += " %s " % (pdf_file)
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
