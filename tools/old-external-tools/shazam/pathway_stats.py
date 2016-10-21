
    samples, data = fileData(path_f)

    pid, pathwayName = getPathwayByFilename(path_f)
    print "pathway:", pathwayName
    #pathwayName, entitySummary, pngFile = imgFG.createPlotFromData(pathwayName, imgSize, 
    #                                                         imgFilename, parametric, 
    #                                                         samples, data, 
    #                                                         red_label, grey_label,
    #                                                         class1, class2)
    numSamples, summary = pSummarizeData(sample_names, data, class1, class2)
    summary = summarizePathway(samples, data, summary)

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

def pSummarizeData(sample_names, data, class1, class2, eps=1e-8):
    # summarize data for 'sample*', 'nw_*', 'na_*'

    summary = {}
    summary["sample"] = {}
    summary["nw"] = {}
    summary["na"] = {}

    sampleIndex = []
    nwIndex = []
    naIndex = []

    print "class1", class1
    print "first 10 sample_names ", sample_names[1:10]
    for i in range(len(sample_names)):
        s = sample_names[i]
        if class2 == "Null":
            if s.startswith("nw_"):
                nwIndex.append(i)
            elif s.startswith("na_"):
                naIndex.append(i)
            else:
                sampleIndex.append(i)
        else:
            found = False
            #pdb.set_trace()
            for class_element in class1:
                if s.startswith(str(class_element)):
                    sampleIndex.append(i)
                    found = True
            if not found:
                for class_element in class2:
                    if s.startswith(str(class_element)):
                        naIndex.append(i)
                        found = True
            #if not found:
            #    print "SKIPPING", s
    numSamples = len(sampleIndex)
    print "#naIndex", naIndex[1:10]
    print numSamples, "#sampleIndex", sampleIndex
    #pdb.set_trace()

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

        #tmp = [vals[i] for i in nwIndex]
        #nwAvg = mean(tmp)
        #nwStd = max(std(tmp), minStdDev)
        #summary["nw"][entity] = (nwAvg, nwStd)
        #tmp_abs = [abs(vals[i]) for i in nwIndex]
        #nwSum = mean(tmp_abs)

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
    #summary["nw"]["labels"] = ("Mean", "Std Dev")
    summary["sample"]["labels"] = ("Mean", "Std Dev",
                                   "Mean of Up Alterations", "Number of Up Alterations", 
                                   "Mean of Down Alterations", "Number of Down Alterations",
                                   "Number of Total Alterations", "Sum Abs Activity - Null")

    return numSamples, summary

