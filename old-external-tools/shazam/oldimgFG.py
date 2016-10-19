import sys, os, string, fnmatch
from pylab import *
from numpy import *
import re

doAll = False
maxFont = 16
minFont = 6
printPDF = False


#def getFilesMatching(baseDir, patterns):
#    list = []
#    
#    for root, dirs, files in os.walk(baseDir):
#        for file in files:
#            ptr = os.path.join(root, file)
#            for pattern in patterns:
#                if fnmatch.fnmatch(ptr, pattern):
#                    list.append(ptr)
#    return list
#

def mad(vals, m):
    return median([abs(v - m) for v in vals])

def npSummarize(vals):
    vals.sort()
    
    numVals = len(vals)
    
    if numVals % 2:
        # odd
        med = vals[int((numVals - 1.0)/2.0)]
    else:
        index = int(numVals/2.0)
        med = (vals[index] + vals[index -1])/2.0
        
        low = vals[int(0.25*numVals)]
        high = vals[int(0.75*numVals)]
        
    return low, med, high

def npSummarizeData(sample_names, data):
    # summarize data for 'sample*', 'nw_*', 'na_*'
    
    summary = {}
    summary["sample"] = {}
    summary["nw"] = {}
    summary["na"] = {}
    
    sampleIndex = []
    nwIndex = []
    naIndex = []
    
    for i in range(len(sample_names)):
        s = sample_names[i]
        if s.startswith("nw_"):
            nwIndex.append(i)
        elif s.startswith("na_"):
            naIndex.append(i)
        else:
            sampleIndex.append(i)
    numSamples = len(sampleIndex)

    for entity in data:
        vals = data[entity]

        tmp = [vals[i] for i in naIndex]
        naLow, naMed, naHigh = npSummarize(tmp)
        summary["na"][entity] = (naLow, naMed, naHigh)

        tmp = [vals[i] for i in nwIndex]
        nwLow, nwMed, nwHigh = npSummarize(tmp)
        summary["nw"][entity] = (nwLow, nwMed, nwHigh)

        tmp = [vals[i] for i in sampleIndex]
        sLow, sMed, sHigh = npSummarize(tmp)
        
        iqr = abs(nwHigh - nwLow)
        if entity == "IL8":
            print nwLow, nwMed, nwHigh, sLow, sMed, sHigh

        tmpUp = []
        tmpDn = []
        for i in sampleIndex:
            if vals[i] > (nwMed + 1.5*iqr):
                tmpUp.append(vals[i])
            elif vals[i] < (nwMed - 1.5*iqr):
                tmpDn.append(vals[i])
                    
        numUp = len(tmpUp)
        if numUp != 0:
            medUp = median(tmpUp)
        else:
            medUp = -9999
            
        numDn = len(tmpDn)
        if numDn != 0:
            medDn = median(tmpDn)
        else:
            medDn = -9999
            
        summary["sample"][entity] = (sLow, sMed, sHigh, medUp, numUp, medDn, numDn)

    summary["na"]["labels"] = ("Lower Quartile", "Median", "Upper Quartile")
    summary["nw"]["labels"] = ("Lower Quartile", "Median", "Upper Quartile")
    summary["sample"]["labels"] = ("Lower Quartile", "Median", "Upper Quartile",
                                   "Median of Up Perturbations", "Number of Up Perturbations", 
                                   "Median of Down Perturbations", "Number of Down Perturbations")
    return numSamples, summary

def getEntities(summary):
    entities = []

    for e in summary["na"]:
        if not e == "labels":
            entities.append(e)

    return entities

def npPlotSummary(titleStr, imgSize, numSamples, summary, outPDF):
    entities = getEntities(summary)
    
    vals = []
    for e in entities:
        (low, med, high, medUp, numUp, medDn, numDn) = summary["sample"][e]
        
        if med < 0:
            tmp = low
        elif med > 0:
            tmp = high
        else:
            if abs(low) > abs(high):
                tmp = low
            else:
                tmp = high
                
        val = (e, tmp)
        vals.append(val)

    sortedVals = sorted(vals, key=lambda (k,v): (v,k), reverse=False)
    entities = [e for (e,val) in sortedVals]    
    
    fig = plt.figure(figsize=imgSize, dpi=80)
    fig.add_axes([0.05,0.05,0.9,0.9])

    Xloc = {}
    X = []
    Y_avg = []
    Y_stdUp = []
    Y_stdDn = []
    
    minNum = 0.25 * float(numSamples)
    numNamed = 0.0
    for e in entities:
        (low, med, high, medUp, numUp, medDn, numDn) = summary["sample"][e]
        
        if numUp >= minNum and abs(medUp) > 0.2:
            numNamed += 1.0
        elif numDn >= minNum and abs(medDn) > 0.2:
            numNamed += 1.0
            
    width, height = imgSize
    scaleForFont = False
    if (maxFont * numNamed) > width*80:
        scaleForFont = True
    fontScale = 0.5 

    i = 0.0
    maxX = 0.0
    factor = 10.0
    for e in entities:        
        (low, med, high, medUp, numUp, medDn, numDn) = summary["sample"][e]
        
        i += 1
        Y_avg.append(med)
        Y_stdUp.append(high)
        Y_stdDn.append(low)
        
        if numUp != 0 and abs(medUp) > 0.2:
            if numUp >= minNum:
                fsize = int((numUp-minNum)/8+8)
                if fsize > maxFont:
                    fsize = maxFont
                if fsize < minFont:
                    fsize = minFont
                if scaleForFont:
                    i += fsize*fontScale
                
                text(i, medUp, e + "(" + str(numUp) + ")",
                     ha="center", va="center", fontsize=fsize,
                     rotation="vertical")
            else:
                if medUp == -9999:
                    plot([i], ' ', 'k.', markersize=numUp/minNum*factor)
                else:
                    plot([i], [medUp], 'k.', markersize=numUp/minNum*factor)
                
        if numDn != 0 and abs(medDn) > 0.2:
            if numDn >= minNum:
                fsize = int((numDn-minNum)/8+8)
                if fsize > maxFont:
                    fsize = maxFont
                if fsize < minFont:
                    fsize = minFont
                if scaleForFont:
                    i += fsize*fontScale
                text(i, medDn, e + "(" + str(numDn) + ")",
                     ha="center", va="center", fontsize=fsize,
                     rotation="vertical")
            else:
                plot([i], [medDn], 'k.', markersize=numDn/minNum*factor)

        X.append(i)
        Xloc[e] = i
        maxX = i

    if scaleForFont:
        i += fsize*fontScale
        maxX = i

    X = []
    Y = {}
    Y["na"] = {}
    Y["na"]["avg"] = []
    Y["na"]["up"] = []
    Y["na"]["dn"] = []
    
    Y["nw"] = {}
    Y["nw"]["avg"] = []
    Y["nw"]["up"] = []
    Y["nw"]["dn"] = []

    for e in entities:
        i = Xloc[e]
        X.append(i)
        
        type = "na"
        (low, med, high) = summary[type][e]
        Y[type]["avg"].append(med)
        Y[type]["up"].append(high)
        Y[type]["dn"].append(low)

        type = "nw"
        (low, med, high) = summary[type][e]
        Y[type]["avg"].append(med)
        Y[type]["up"].append(high)
        Y[type]["dn"].append(low)

    plot(X, Y["nw"]["avg"], 'k', label='null(w)')
    fill_between(X, Y["nw"]["up"], Y["nw"]["dn"], edgecolor='k', facecolor='k', alpha=0.1)
                
    plot(X, Y_avg, 'r', label='true')
    fill_between(X, Y_stdUp, Y_stdDn, edgecolor='r', facecolor='r', alpha=0.3)
    
    plot([1,maxX], [0,0], 'k:', alpha=0.8)
    xlim(0, maxX + 1)
    ylim(-4,4)
    xlabel("Factor Graph Nodes")
    ylabel("Log-Odds")
    title(titleStr)
    legend(loc='lower right')
    
    ax = gca()
    setp(ax.get_xticklabels(), visible=False)

    savefig(outPDF)
    close()

def quantileSorted(list, quantile):
    """Assumes that list is already sorted"""
    if len(list) == 0: return 0
    index = int(floor(quantile * len(list)))
    return list[index]

def pSummarizeData(sample_names, data, eps=1e-8):
    # summarize data for 'sample*', 'nw_*', 'na_*'

    summary = {}
    summary["sample"] = {}
    summary["nw"] = {}
    summary["na"] = {}

    sampleIndex = []
    nwIndex = []
    naIndex = []

    for i in range(len(sample_names)):
        s = sample_names[i]
        if s.startswith("nw_"):
            nwIndex.append(i)
        elif s.startswith("na_"):
            naIndex.append(i)
        else:
            sampleIndex.append(i)
    print "#naIndex", naIndex
    print "#sampleIndex", sampleIndex
    numSamples = len(sampleIndex)

    backgroundSDs = []
    for entity in data:
        backgroundSDs.append(std([data[entity][i] for i in naIndex]))
    backgroundSDs = sorted([x for x in backgroundSDs if (x > eps)])

    minStdDev = quantileSorted(backgroundSDs, 0.05)
    total_act_sum = 0.0

    for entity in data:
        vals = data[entity]
        
        tmp = [vals[i] for i in naIndex]
        naAvg = mean(tmp)
        naStd = max(std(tmp), minStdDev)
        summary["na"][entity] = (naAvg, naStd)
        tmp_abs = [abs(vals[i]) for i in naIndex]
        naSum = mean(tmp_abs)

        tmp = [vals[i] for i in nwIndex]
        nwAvg = mean(tmp)
        nwStd = max(std(tmp), minStdDev)
        summary["nw"][entity] = (nwAvg, nwStd)
        tmp_abs = [abs(vals[i]) for i in nwIndex]
        nwSum = mean(tmp_abs)

        tmp = [vals[i] for i in sampleIndex]
        sAvg = mean(tmp)
        sStd = std(tmp)
        tmp_abs = [abs(vals[i]) for i in sampleIndex]
        sSum = mean(tmp_abs)
        
        tmpUp = []
        tmpDn = []
        for i in sampleIndex:
            if vals[i] >= (naAvg+2.0*naStd):
                tmpUp.append(vals[i])
            elif vals[i] <= (naAvg-2.0*naStd):
                tmpDn.append(vals[i])

        numUp = len(tmpUp)
        if numUp != 0:
            avgUp = mean(tmpUp)
        else:
            avgUp = -9999

        numDn = len(tmpDn)
        if numDn != 0:
            avgDn = mean(tmpDn)
        else:
            avgDn = -9999
#        if (numUp > 0) or numDn > 0:
#            print entity, "mean samples and nulls: ", sAvg, naAvg
#            print entity, "sd: ", sStd, naStd
#            print "    # samples > and < 2.0 sd away from mean ", numUp, numDn
#            print "    avg IPL up and down  ", avgUp, avgDn
            
        total = numUp + numDn
        total_act = sSum - naSum
        if total_act < 0:
            total_act = 0
        total_act_sum += total_act
        
        summary["sample"][entity] = (sAvg, sStd, avgUp, numUp, avgDn, numDn, total, total_act)
        #print sAvg, sStd, avgUp, numUp, avgDn, numDn, total, total_act, entity

    print " summarizing: ", numSamples, "samples", len(nwIndex), "nw", len(naIndex), "na", "norm_activity" , total_act_sum,
    summary["na"]["labels"] = ("Mean", "Std Dev")
    summary["nw"]["labels"] = ("Mean", "Std Dev")
    summary["sample"]["labels"] = ("Mean", "Std Dev",
                                   "Mean of Up Perturbations", "Number of Up Perturbations", 
                                   "Mean of Down Perturbations", "Number of Down Perturbations",
                                   "Number of Total Perturbations", "Sum Abs Activity - Null")

    return numSamples, summary

def pPlotSummary(titleStr, imgSize, numSamples, summary, outPDF):
    entities = getEntities(summary)

    vals = []
    for e in entities:
        #(avg, std) = summary["na"][e]
        #(avg, std) = summary["nw"][e]
        (avg, std, avgUp, numUp, avgDn, numDn, total, total_act) = summary["sample"][e]
        
        val = (e, avg) 
        vals.append(val)

    sortedVals = sorted(vals, key=lambda (k,v): (v,k), reverse=False)

    entities = [e for (e,val) in sortedVals]

    fig = plt.figure(figsize=imgSize, dpi=80)
    fig.add_axes([0.05,0.05,0.9,0.9])

    # Plot real data
    X = []
    Y_avg = []
    Y_stdUp = []
    Y_stdDn = []

    Xloc = {}
    factor = 1.0

    minNum = 0.10 * float(numSamples)
    numNamed = 0.0
    for e in entities:
        (avg, std, avgUp, numUp, avgDn, numDn, total, total_act) = summary["sample"][e]

        if numUp >= minNum and abs(avgUp) > 0.2:
            numNamed += 1.0
        elif numDn >= minNum and abs(avgDn) > 0.2:
            numNamed += 1.0

    width, height = imgSize
    scaleForFont = False
    if (maxFont * numNamed) > width*80:
        scaleForFont = True
    fontScale = maxFont * numNamed / width*80

    i = 0
    maxX = 0
    for e in entities:
        (avg, std, avgUp, numUp, avgDn, numDn, total, total_act) = summary["sample"][e]

        i += 1
        Y_avg.append(avg)
        Y_stdUp.append(avg+std)
        Y_stdDn.append(avg-std)

        if numUp != 0 and abs(avgUp) > 0.2:
            if numUp >= minNum:
                fsize = int((numUp-minNum)/8+8)
                if fsize > maxFont:
                    fsize = maxFont
                if fsize < minFont:
                    fsize = minFont
                if scaleForFont:
                    i += fsize*fontScale
                #text(i, avgUp, e + "(" + str(numUp) + ")", 
                #     ha="center", va="center", fontsize=fsize,
                #     rotation="vertical")
            else:
                pass
                #plot([i], [avgUp], 'k.', markersize=numUp*factor)

        if numDn != 0 and abs(avgDn) > 0.2:
            if numDn >= minNum:
                fsize = int((numDn-minNum)/8+8)
                if fsize > maxFont:
                    fsize = maxFont
                if fsize < minFont:
                    fsize = minFont
                if scaleForFont:
                    i += fsize*fontScale
                #text(i, avgDn, e + "(" + str(numDn) + ")", 
                #     ha="center", va="center", fontsize=fsize,
                #     rotation="vertical")
            else:
                pass
                #plot([i], [avgDn], 'k.', markersize=numDn*factor)
        text(i, -3.95, e, 
                     ha="center", va="bottom", fontsize=10,
                     rotation="vertical")
        Xloc[e] = i
        X.append(i)
        maxX = i

    if scaleForFont:
        maxX += fsize*fontScale


    # Plot null distribution
    X = []
    Y = {}
    Y["na"] = {}
    Y["na"]["avg"] = []
    Y["na"]["up"] = []
    Y["na"]["dn"] = []

    Y["nw"] = {}
    Y["nw"]["avg"] = []
    Y["nw"]["up"] = []
    Y["nw"]["dn"] = []
    for e in entities:
        i = Xloc[e]
        X.append(i)

        type = "na"
        (avg, std) = summary[type][e]
        Y[type]["avg"].append(avg)
        Y[type]["up"].append(avg + std)
        Y[type]["dn"].append(avg - std)

        type = "nw"
        (avg, std) = summary[type][e]
        Y[type]["avg"].append(avg)
        Y[type]["up"].append(avg + std)
        Y[type]["dn"].append(avg - std)

    plot(X, Y["na"]["avg"], 'k', label='Mean activity in all permuted samples')
    fill_between(X, Y["na"]["up"], Y["na"]["dn"], edgecolor='k', facecolor='k', alpha=0.1)

    #plot(X, Y["nw"]["avg"], 'b', label='Mean activity in within permuted samples')
    #fill_between(X, Y["nw"]["up"], Y["nw"]["dn"], edgecolor='b', facecolor='b', alpha=0.1)

    plot(X, Y_avg, 'r', label='Mean activity in patient samples')
    fill_between(X, Y_stdUp, Y_stdDn, edgecolor='r', facecolor='r', alpha=0.3)

    plot([1,maxX], [0,0], 'k:', alpha=0.8)
    xlabel("Cellular Entities")
    ylabel("Inferred Activity")
    title(titleStr)
    legend(loc='upper left')
    xlim(0, maxX + 1)
    ylim(-4,4)

    # Hide the x-axis numbers, they don't mean anything
    ax = gca()
    setp(ax.get_xticklabels(), visible=False)

    savefig(outPDF)
    close()


def createPlotFromData(pathwayName, imgSize, imgFilename, parametric, sample_names, data):
    if parametric:
        numSamples, summary = pSummarizeData(sample_names, data)
        titleStr = pathwayName + " -- " + str(numSamples) + " samples"
        if (printPDF):
            pPlotSummary(titleStr, imgSize, numSamples, summary, imgFilename)
    else:
        numSamples, summary = npSummarizeData(sample_names, data)
        
        titleStr = pathwayName + " -- " + str(numSamples) + " samples"

        if (printPDF):
            npPlotSummary(titleStr, imgSize, numSamples, summary, imgFilename)

    return pathwayName, summary, imgFilename


#def createPlotFromFile(baseDir, f, imgSize, parametric, uniqueName):
#    i = f.find("pid")
#    if i == -1:
#        print "string 'pid' not found in file name", f
#        sys.exit(0)
#
#    tmp = f[i:-4].split('_')
#    pid = tmp[0] + '_' + tmp[1]    
#    
#    pathwayName = getPathwayName(pid)
#    samples, data = fileData(f)

#    if parametric:
#        imgFilename = baseDir + uniqueName + '_' + pid + "_p_summary.pdf"
#    else:
#        imgFilename = baseDir + uniqueName + '_' + pid + "_np_summary.pdf"
    
#    return createPlotFromData(pathwayName, imgSize, imgFilename, parametric, samples, data)
