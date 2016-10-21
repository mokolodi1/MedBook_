#!/usr/bin/python2.6

import sys, string, os, time, fnmatch, imgFG, markup, re
from markup import oneliner as o
from numpy import *


rootDir = ""
pngDir = ""
pngBase = 'png/'
pathwayNameDict = {}
entityDict = {}
entityFile = {}
imgFG.printPDF = True
class1 = []
class2 = []
class3 = []

def parseContrast(file_name, red_label, grey_label):
    global class1
    global class2
    inFile = open(file_name)
#class1   = ["DTB-004", "DTB-009", "DTB-024Pro", "DTB-030", "DTB-034", "DTB-036", "DTB-046", "DTB-049", "DTB-053", "DTB-064", "DTB-073"]
#class2 = ["DTB-003", "DTB-005", "DTB-011", "DTB-018", "DTB-022", "DTB-023", "DTB-038", "DTB-040", "DTB-060", "DTB-063", "DTB-071", "DTB-080"]
    lineCount = 0
    for line in inFile:
        lineCount+=1
        data = line[:-1].split('\t')
        if len(data) == 2:
            sample = data[0]
            if sample == 'Sample':
                continue
            s_class = data[1]
            if s_class == red_label:
                class1.append(sample)
            elif grey_label == 'Null':
                class2.append(grey_label)
            elif s_class == grey_label:
                class2.append(sample)
            else:
                print "invalid sample label", line

    inFile.close()

def getPathwayName(pid):
    pid = pid.split('_')
    if len(pid) != 2:
        return "N/A"

    pid = pid[1]
    pid = re.sub("\.","", pid)

    try:
        name = pathwayNameDict[pid]
    except:
        name = "N/A"
    return name

def initEntityDict(file_name):
    inFile = open(file_name)
    lineCount = 0
    for line in inFile:
        lineCount+=1
        data = line[:-1].split('\t')
        if len(data) == 2:
            type = data[0]
            name = data[1]
            if name in entityDict:
                if entityDict[name] != type and file_name == entityFile[name]:
                    print "on line ", lineCount, name, "cannot be assigned ",type, "when it is", entityDict[name] , "in", file_name , entityFile[name]
                    assert(entityDict[name] == type)
                elif entityDict[name] != type:
                    if type != 'protein' and entityFile[name] == 'protein':
                        print "WARNING", lineCount, name, "has multiple types ",type, "and", entityDict[name] , "in", file_name , entityFile[name]
                        type = 'protein'
            entityDict[name] = type
            entityFile[name] = file_name
    inFile.close()

def initPathwayNameDict(path_file="pathway_pids.tab"):
    inFile = open(path_file)
    for line in inFile:
        data = line[:-1].split('\t')
        pid = data[0]
        name = data[1]
        pathwayNameDict[pid] = name
    inFile.close()

def getFilesMatching(baseDir, patterns):
    list = []
    
    for root, dirs, files in os.walk(baseDir):
        for file in files:
            ptr = os.path.join(root, file)
            for pattern in patterns:
                if fnmatch.fnmatch(ptr, pattern):
                    list.append(ptr)
    return list
                
def writePageToFile(page, fname):
    outFile = open(fname, 'w')
    outFile.write(str(page))
    outFile.close()
    
def initializePage(t, h, sort_list = "[[9,1]]"):
    currentTime = time.localtime()
    dateTime = str(currentTime[1]) + '/' + str(currentTime[2]) + '/' + str(currentTime[0]) + " "
    dateTime += str(currentTime[3]) + ":" + str(currentTime[4]) + ":" + str(currentTime[5])

    csses = "style.css"   

    tsStr = '\n$(document).ready(function()\n'
    tsStr += '  {\n'
    tsStr += '      $("table").tablesorter({\n'
    tsStr += '      // sort on the tenth column , order desc \n'
    tsStr += '          sortList: '+sort_list+' \n'
    tsStr += '              }); \n'
    tsStr += '  }\n'
    tsStr += ');\n'
    scripts = [('js/jquery-latest.js',['javascript','']),
               ('js/jquery.tablesorter.min.js',['javascript','']),
               ('js/jquery.metadata.js',['javascript','']),
               ('',['javascript',tsStr])]
    
    page = markup.page()
    pathway_name = re.sub(" ","_",re.sub("/","_",t))
    summary_tsv = open(rootDir + pathway_name+'.tsv', 'wb')
    summary_tsv.write("Gene\tAvg num Alterations\tTotal alterations\tnum genes\tmin mean truth\tmax mean truth\tmin mean any\tmax mean any\tnormalized activity\n")
    page.init(title = t, 
              header = h,
              script=scripts,
              css = (csses, 'print, projection, screen'),
              footer = "Last modified on " + dateTime)

    return page, summary_tsv

def putSummaryTable(p, b, data, id, tsv):
    labels = data["sample"]["labels"]
    
    p.table(border=b, id=id, class_='tablesorter')
    p.thead()
    p.tr()
    p.th("Entity - Gene or Complex or Molecule")
    p.th(labels, class_="{sorter:'digit'}")
    p.tr.close()
    p.thead.close()

    p.tbody()
    for d in data["sample"]:
        if d == "labels":
            continue
        vals = data["sample"][d]
        p.tr()
        #name of gene
        geneUrl = 'http://www.genecards.org/cgi-bin/carddisp.pl?gene='+d
        tsv.write('<a href=%s target="_blank">%s</a>\t' % (geneUrl, d))
        p.td(o.a(d, href=geneUrl, target="_blank"))
        tmp = [round(v, 3) for v in vals]
        for v in vals:
            tsv.write('%s\t' % str(round(v,3)))
        p.td(tmp)
        p.tr.close()
        tsv.write('\n')
    p.tbody.close()

    tsv.close()
    p.table.close()

def getPathwayByFilename(f):
    i = f.find("pid")
    if i == -1:
        print "string 'pid' not found in file name", f
        sys.exit(0)
        
    tmp = f[i:-3].split('_')
    pid = tmp[0] + '_' + tmp[1]
    pid = re.sub("\.","", pid)
    
    print "pid:",pid
    return pid, getPathwayName(pid)
    

def summarizePathway(samples, data, entitySummary):
    sampleIndex = []
    nwIndex = []
    naIndex = []
    
    for i in range(len(samples)):
        s = samples[i]
        if s.startswith("nw_"):
            nwIndex.append(i)
        elif s.startswith("na_"):
            naIndex.append(i)
        else:
            sampleIndex.append(i)
    
    totalOutliers = 0
    totalActivity = 0
    count = 0
    geneCount = 0
    for d in entitySummary["sample"]:
        if d == "labels":
            continue
        vals = entitySummary["sample"][d]
        totalOutliers += vals[6]
        try:
            totalActivity += vals[7]
        except:
            print "error: no activity for ",d
            sys.exit(2)
            totalActivity += 0
        try:
            if entityDict[d] == 'protein':
                geneCount += 1
        except:
            pass
        count += 1
        
    if geneCount > 0:
        avgOutliers = 1.0 * totalOutliers / geneCount;
    else:
        avgOutliers = 0.0
    print "entities", count, "genes", geneCount

    minMean = 1000
    maxMean = -1000
    #minMeanNw = 1000
    #maxMeanNw = -1000
    minMeanNa = 1000
    maxMeanNa = -1000
    for d in data:
        vals = data[d]

        tmp = [vals[i] for i in sampleIndex]        
        m = mean(tmp)
        if m < minMean:
            minMean = m
        elif m > maxMean:
            maxMean = m

        #tmp = [vals[i] for i in nwIndex]        
        #m = mean(tmp)
        #if m < minMeanNw:
        #    minMeanNw = m
        #elif m > maxMeanNw:
        #    maxMeanNw = m

        tmp = [vals[i] for i in naIndex]        
        m = mean(tmp)
        if m < minMeanNa:
            minMeanNa = m
        elif m > maxMeanNa:
            maxMeanNa = m

    if geneCount < 10: 
        return None
    summary = {}
    summary["Avg Num Alterations"] = avgOutliers
    summary["Total Alterations"] = totalOutliers
    summary["Num Genes"] = geneCount
    summary["Min Mean Truth"] = minMean
    summary["Max Mean Truth"] = maxMean
    summary["Min Mean Any"] = minMeanNa
    summary["Max Mean Any"] = maxMeanNa
    if geneCount > 0:
        summary["Normalized Activity"] = 100 * totalActivity / geneCount
        print "summary Normalized Activity",  100 * totalActivity / geneCount
    else:
        print "#warning geneCount = 0"
    summary["order"] = ("Avg Num Alterations", "Total Alterations",
                        "Num Genes",
                        "Min Mean Truth", "Max Mean Truth", 
                        "Min Mean Any", "Max Mean Any", "Normalized Activity")
    return summary

def fileData(fname):
    inFile = open(fname)
    line = inFile.readline()
    header = line[:-1].split('\t')
    sample_names = header[1:]

    fData = {}
    for line in inFile:
        data = line[:-1].split('\t')

        name = data[0]
        data = data[1:]
        if len(name.split("__")) > 1:
            continue
        
        try:
            vals = [float(d) for d in data]
            fData[name] = vals
        except:
            continue

    return sample_names, fData

def createSampleListPage(path_f, parametric, uniqueName, red_label, grey_label):
    samples, data = fileData(path_f)

    pid, pathwayName = getPathwayByFilename(path_f)
    print "pathway:", pathwayName

    if parametric:
        imgFilename = pngDir + uniqueName + '_' + pid + "_p_summary.png"
    else:
        imgFilename = pngDir + uniqueName + '_' + pid + "_np_summary.png"
    #print "#image file ", imgFilename, "root", rootDir, "png", pngDir

    imgSize = (12,5)
    pathwayName, entitySummary, pngFile = imgFG.createPlotFromData(pathwayName, imgSize, 
                                                             imgFilename, parametric, 
                                                             samples, data, 
                                                             red_label, grey_label,
                                                             class1, class2)
    basePNG = os.path.basename(pngFile)

    page, summary_tsv = initializePage(t = pathwayName + " -- " + uniqueName, 
                          h = "", sort_list = "[[8,1]]")
    #ipl plot at top of page
    #summary_tsv.write('<img src="%s" alt="Summary Plot"\n' % pngDir+basePNG)
    #summary_tsv.write('Result table\n')
    page.img(src=pngBase+basePNG, alt="Summary Plot")
    page.p("Result table")

    putSummaryTable(p=page, b="1", data=entitySummary, id="result_table", tsv=summary_tsv)

    fname = basePNG[:-4] + ".html"
    print "createSampleListPage"
    writePageToFile(page, rootDir + fname)
    
    summary = summarizePathway(samples, data, entitySummary)

    return fname, pathwayName, summary


def createGeneListPage(path_f, parametric, uniqueName, red_label, grey_label):
    samples, data = fileData(path_f)

    pid, pathwayName = getPathwayByFilename(path_f)
    print "pathway:", pathwayName

    if parametric:
        imgFilename = pngDir + uniqueName + '_' + pid + "_p_summary.png"
    else:
        imgFilename = pngDir + uniqueName + '_' + pid + "_np_summary.png"
    print "#image file ", imgFilename, "root", rootDir, "png", pngDir

    imgSize = (12,5)
    pathwayName, entitySummary, pngFile = imgFG.createPlotFromData(pathwayName, imgSize, 
                                                             imgFilename, parametric, 
                                                             samples, data,
                                                             red_label, grey_label,
                                                             class1, class2)
    basePNG = os.path.basename(pngFile)

    page, summary_tsv = initializePage(t = pathwayName + " -- " + uniqueName, 
                          h = "", sort_list = "[[8,1]]")
    #ipl plot at top of page
    #summary_tsv.write('<img src="%s" alt="Summary Plot"\n' % pngDir+basePNG)
    #summary_tsv.write('Result table\n')
    page.img(src=pngBase+basePNG, alt="Summary Plot")
    page.p("Result table")

    putSummaryTable(p=page, b="1", data=entitySummary, id="result_table", tsv=summary_tsv)

    fname = basePNG[:-4] + ".html"
    print "createGeneListPage"
    writePageToFile(page, rootDir + fname)
    
    summary = summarizePathway(samples, data, entitySummary)

    return fname, pathwayName, summary


def putResultsTable(p, b, data, id):
    # p -> page
    # data -> html_filename, pathwayName, summary dictionary (one row per pathway)
    r = data[0]
    summaryVals = r[2]
    header = summaryVals["order"]
    
    p.table(border=b, id=id, class_='tablesorter')
    p.thead()
    p.tr()
    p.th("Image")
    p.th("Name")
    p.th(header, class_="{sorter:'digit'}")
    p.tr.close()
    p.thead.close()

    summary_tsv = open(rootDir+'/summary.tsv','wb')
    summary_tsv.write("Pathway\tAvg num Alterations\tTotal alterations\tnum genes\tmin mean truth\tmax mean truth\tmin mean any\tmax mean any\tnormalized activity\n")
    p.tbody()
    rowCount = 0
    rowSum = [0 for h in header]
    for r in data:
        htmlFile = r[0]
        pathwayName = r[1]
        summaryVals = r[2]
        p.tr()

        base = os.path.basename(htmlFile)
        #plot of ipls
        p.td(o.a(o.img(src = pngBase + base[:-5] + ".png", width=100), href=base))
        #link to pathway details page
        p.td(o.a(pathwayName, href=base))
        summary_tsv.write(pathwayName+'\t')

        vals = [round(summaryVals[h],3) for h in header]
        for v in vals:
            summary_tsv.write(str(v)+'\t')
        #additional columns of data 
        p.td(vals)
        
        i = 0
        #add data to totals for bottom of page
        for h in header:
            rowSum[i] += summaryVals[h]
            i += 1

        #end of row
        summary_tsv.write('\n')
        p.tr.close()
    
    summary_tsv.close()
    p.tbody.close()
    p.tbody()
    p.tr()
    p.td('')
    p.td('Total')
    # last row in table is sums
    p.td(rowSum)
    p.tr.close()
    p.tbody.close()
    
    p.table.close()

def createIndexPage(pResults, npResults, index_html):
    page, summary_tsv = initializePage(t = "Factor Graph Results", 
                          h = "") 
    page.p("Per-pathway summary of activity")
    putResultsTable(p=page, b="1", data=pResults, id="result_table1")

    #page.p("Non-Parametric Results")
    #putResultsTable(p=page, b="1", data=npResults, id="result_table2")

    print "createIndexPage", index_html
    writePageToFile(page, index_html)

def createTopPathwaysPage(pResults):
    page, summary_tsv  = initializePage(t = "Per-pathway summary of activity", h = "")
    page.p("Per-pathway summary of activity")
    page.p('<a href="index.html">Click here for all pathways</a>')
    putResultsTable(p=page, b="1", data=pResults[0:10], id="results")
    page.p('<a href="index.html">Click here for all pathways</a>')
    print "createTopPathwaySummaryPage"
    writePageToFile(page, rootDir + "summary.html")

def main(directory, pathway_directory, contrast_file, red_label, grey_label, index_html_path):
    # create all html pages for each individual run, including images
    # collect objects containing html page, whatever pathway-level summary info (in 2d dict)
    # use objects to generate root level index.html

    global rootDir
    global pngDir
    global class1
    global class2

    parseContrast(contrast_file, red_label, grey_label)
    print len(class1), "samples for class1 ", red_label, class1
    print len(class2), "samples for class2 ", grey_label, class2
    fdir = os.path.dirname(index_html_path)
    print "dir", fdir
    if fdir == "":
        fdir=os.getcwd()
    rootDir = fdir+'/html/'
    print "rootDir", rootDir
    pathways = getFilesMatching(pathway_directory, ["*pid*tab","*pid*spf"])
    for fname in pathways:
        initEntityDict(fname)
    print "reading ipls", directory
    files = getFilesMatching(directory, ["*transpose*.out"])
    pngDir = rootDir + pngBase
    os.system('mkdir -p '+pngDir)
    os.system('cp -p ./style.css '+rootDir)
    os.system('cp -pr ./js '+rootDir)
    print "mkdir -p "+pngDir
    
    pResults = []
    parametric = True
    datasetName = os.path.basename(directory.strip('/'))
    for f in files:
        if f == "merged_transpose_pid_example.out":
            continue
        print "File: "+f, "dataset:", datasetName

        # list of genes and complexes for a pathway
        r = createGeneListPage(f, parametric, datasetName, red_label, grey_label)

        # fname, pathwayName, summary
        print "     #createGeneListPage pathway ", r[1], r[2], r[0]
        if r[2] != None:
            pResults.append(r)

    npResults = []
    #parametric = False
    #for f in files:
    #    if f == "merged_transpose_pid_example.out":
    #        continue
    #    r = createGeneListPage(f, parametric, directory.strip('/'))
    #    npResults.append(r)

    #pResults.sort(key=lambda x: -x[2]["Avg Num Alterations"])
    pResults.sort(key=lambda x: -x[2]["Normalized Activity"])

    #main pathway summary page (all pathways)
    createIndexPage(pResults, npResults, index_html_path)

    #main pathway summary page (top 10)
    createTopPathwaysPage(pResults)

def usage():
    print "usage: python htmlFG.py ipl_directory pathway_directory pathway_pids.tab contrast_file class1_label class2_label index.html"
    print "         ipl_directory contains one IPL matrix per pathway"
    print "         pathway_directory contains one spf file per pathway"
    print "         pathway_pids.tab is a 3 col file with list of pathways in pathway_directory: pid, description, source"
    print "         contrast_file contains tab delimted file, first col is sample id and second is class of sample"
    print " Note: pathway names must start with pid_ and end with _pathway.tab"
    print
    sys.exit(0)

if __name__ == "__main__":
    if len(sys.argv) != 8:
        usage()
    
    directory = sys.argv[1]
    pathways = sys.argv[2]
    path_list = sys.argv[3]
    contrast_file = sys.argv[4]
    red_label = sys.argv[5]
    grey_label = sys.argv[6]
    index_html_path = sys.argv[7]
    initPathwayNameDict(path_file=path_list)
    import pdb 
    main(directory, pathways, contrast_file, red_label, grey_label, index_html_path)
