#!/usr/bin/python

import json, os, sys, pdb, datetime, numpy, scipy, scipy.stats
import sqlite3, optparse, re
from operator import itemgetter

validTypes = [ "EXP", "CNA", "IPL", "CNA" ]
source = "TCGA DATA"
platform = [ "PARADIGM/EXP/CNA"]
phenotype = "TP53 Mutation"

FEATURES = set()

m = 10000

def err_handler(type, flag):
    print "Numpy Floating point error (%s), with flag %s" % (type, flag)
    return

saved_handler = numpy.seterrcall(err_handler)
save_err = numpy.seterr(all='call')

def generate(conn, options):
    FeatureMap = {}
    FeatureList = []
    SigArray = numpy.zeros((m,m))
    maxSig = -1

    (count,) = conn.execute("SELECT Count(*) FROM Data").fetchone()
    cursor = conn.execute("SELECT * FROM Data")
    i = 0
    while True:
	i += 1
	if (i % 10000) == 0: print i, "of", count, (i * 100 / count), "%"
	w = cursor.fetchone()
	if w:
	    signature = w[0]
	    if maxSig < signature:
		maxSig = signature
	    name = w[1]
	    d_score = w[2]

	    if name in FeatureMap:
		feature = FeatureMap[name]
	    else:
		feature = len(FeatureList)
		FeatureMap[name] = feature
		FeatureList.append(feature)
	    SigArray[signature, feature] = d_score
	else:
	    f = options.database + ".numpyCache"
	    print "begin saving to", f
	    numpy.savez(f, SigArray=SigArray[ :maxSig+1, :len(FeatureList)], FeatureMap=FeatureMap)
	    print " done saving"
	    return

#Mutual information
# From http://blog.sun.tc/2010/10/mutual-informationmi-and-normalized-mutual-informationnmi-for-numpy.html
def mutual_information(x,y):
    N=double(x.size)
    I=0.0
    eps = numpy.finfo(float).eps
    for l1 in unique(x):
        for l2 in unique(y):
            #Find the intersections
            l1_ids=nonzero(x==l1)[0]
            l2_ids=nonzero(y==l2)[0]
            pxy=(double(intersect1d(l1_ids,l2_ids).size)/N)+eps
            I+=pxy*log2(pxy/((l1_ids.size/N)*(l2_ids.size/N)))
    return I

#Normalized mutual information
def normalized_mutual_inforamtion(x,y):
    N=x.size
    I=mutual_info(x,y)
    Hx=0
    for l1 in unique(x):
        l1_count=nonzero(x==l1)[0].size
        Hx+=-(double(l1_count)/N)*log2(double(l1_count)/N)
    Hy=0
    for l2 in unique(y):
        l2_count=nonzero(y==l2)[0].size
        Hy+=-(double(l2_count)/N)*log2(double(l2_count)/N)
    return I/((Hx+Hy)/2)

def sigChallenge(sampleFile, conn, options):
    #f = options.database + ".numpyCache.npz"
    #d = numpy.load(f);
    #SigArray=d["SigArray"]
    SigArray = numpy.fromfile("signature.tab", dtype=float, count=-1, sep='\t')
    #FeatureMap=d["FeatureMap"]
    FeatureMap = numpy.fromfile("featuremap.tab", dtype=string, count=-1, sep='\t')
    #FeatureMap = FeatureMap.reshape(-1)[0]
    mSigs,nFeatures = SigArray.shape

    first = None
    if options.verbose: sys.stderr.write("loading in " + sampleFile + "\n")
    for line in open(sampleFile):
        words = line[:-1].split("\t")
        if first == None:
            first = words
	    oSamples =  len(words) -1
            samples = numpy.zeros((oSamples, nFeatures))
        else:
            assert len(words) == len(first)
            feature = words[0]
            if feature in FeatureMap:
		for i in xrange(1,len(words)):
		    try:
		        samples[i-1,FeatureMap[feature]] = float(words[i])
		    except ValueError:
		        samples[i-1,FeatureMap[feature]] = 0.0

    if options.verbose: sys.stderr.write( sampleFile + " loaded\n")
    allData = {}
    d = []
    algorithms = set(options.algorithms.split(","))

    if "pearson" in algorithms:
	d.append("pearson_r")
	d.append("pearson_p_value")

    if "dot" in algorithms:
	d.append("dot")

    if "spearman" in algorithms:
	d.append("spearman_rho")
	d.append("spearman_p_value")

    if "kendall" in algorithms:
	d.append("kendall_tau")
	d.append("kendall_p_value")

    if "mutual_information" in algorithms:
	d.append("mutual_information")

    if "normalized_mutual_information" in algorithms:
	d.append("normalized_mutual_information")



    #output = sqlite3.connect(options.results)
    #output.isolation_level = None
    #o = output.cursor()
    s = (",".join([dd + " float " for dd in d]))
    
    #o.execute("CREATE TABLE IF NOT EXISTS Results ( SampleName, dir,platform,platform_version,date,cancertype,featuretype,phenotypeclass,feature,total,pos_support,neg_support," + s  + ")")

    names = ",".join(d)

    sys.stdout.write("\t".join(d) + "\n")
    for i,sampleName in enumerate(first[1:]):
        sample = samples[i,:]
	values = []
        if options.verbose: sys.stderr.write( options.restrict + " restriction \n")
        #cc = conn.execute("SELECT s.rowid,s.dir,s.platform,s.platform_version,s.date,s.cancertype,s.featuretype,s.phenotypeclass,s.feature,  count(*), coalesce(count(case when p.state = 1 then 1 end), 0), coalesce(count(case when p.state = 0 then 1 end), 0) FROM Signatures s INNER JOIN Samples p where s.rowid = p.signature and dir REGEXP ? group by s.rowid", (options.restrict,));
        item = True # feels like the first time
        while item:
            item = cc.fetchone()
            if item == None: continue

            (rowid,dir,platform,platform_version,date,cancertype,featuretype,phenotypeclass,feature,total,pos_support,neg_support) = item
            if options.verbose: sys.stderr.write( dir + " processing\n")

            sig = SigArray[rowid,:]
            if numpy.all(sig == 0): continue
           
            d = [sampleName, dir,platform,platform_version,date,cancertype,featuretype,phenotypeclass,feature,total,pos_support,neg_support ]
            if "pearson" in algorithms:
                r2,var = scipy.stats.pearsonr(sample,sig)
                d.append(r2)
                d.append(var)
            if "dot" in algorithms:
                dot = numpy.dot(sample,sig)
                d.append(dot)
            if "spearman" in algorithms:
                spr2, spvar = scipy.stats.spearmanr(sample,sig)
                d.append(spr2)
                d.append(spvar)
            if "kendall" in algorithms:
                tau, p_value = scipy.stats.kendalltau(sample, sig)
                d.append(tau)
                d.append(p_value)
            if "mutual_information" in algorithms:
                mi = mutual_information(smaple, sig)
                d.append(mi)
            if "normalized_mutual_information" in algorithms:
                nmi = normalized_mutual_information(smaple, sig)
                d.append(nmi)

            values.append(d)

	    """
	    for r in d:
		sys.stdout.write("\t"+str(r))
	    sys.stdout.write("\n")
	sys.stdout.write("\n")
	    """
        #if values:
        #    o.executemany("INSERT INTO Results (SampleName, dir,platform,platform_version,date,cancertype,featuretype,phenotypeclass,feature,total,pos_support,neg_support," + names + ") values("+ ",".join(["?"]*len(d)) +")", values)
        #    output.commit()

def insertResults(inputFile, conn, options):
    allData = {}
    d = []
    algorithms = set(options.algorithms.split(","))

    if "pearson" in algorithms:
	d.append("pearson_r")
	d.append("pearson_p_value")

    if "dot" in algorithms:
	d.append("dot")

    if "spearman" in algorithms:
	d.append("spearman_rho")
	d.append("spearman_p_value")

    if "kendall" in algorithms:
	d.append("kendall_tau")
	d.append("kendall_p_value")

    if "mutual_information" in algorithms:
	d.append("mutual_information")

    if "normalized_mutual_information" in algorithms:
	d.append("normalized_mutual_information")
    names = ",".join(d)
    #output = sqlite3.connect(options.results)
    #output.isolation_level = None
    #o = output.cursor()
    #s = (",".join([dd + " float " for dd in d]))
    
    #o.execute("CREATE TABLE IF NOT EXISTS Results ( SampleName, dir,platform,platform_version,date,cancertype,featuretype,phenotypeclass,feature,pos_support,neg_support," + s  + ")")

    for line in open(inputFile):
        values = line[:-1].split("\t")
        if values:
            print "len of values",len(values), values
            print "INSERT INTO Results (SampleName, dir,platform,platform_version,date,cancertype,featuretype,phenotypeclass,feature,total,pos_support,neg_support," + names + ") values("+ ",".join(["?"]*(len(d)+11)) +")", values
            #o.execute("INSERT INTO Results (SampleName, dir,platform,platform_version,date,cancertype,featuretype,phenotypeclass,feature,total,pos_support,neg_support," + names + ") values("+ ",".join(["?"]*(len(d)+11)) +")", values)
            #output.commit()

def sigMaker(c, dir):
    count = c.execute("SELECT Count(*) FROM Signatures where dir = :dir", {"dir": dir}).fetchone()
    count = count[0]
    if count > 0:
        return;

    print dir
    os.chdir(dir)
    sig  = {}

    words = dir.split("/")
    for r in ['', 'projects', 'sysbio', 'users', 'TCGA',   'hypotheses', '']:
	words.remove(r)
    cancertype  = words.pop(0)
    feature  = words.pop(-1)
    occam, phenotypeclass, featuretype = words.pop(-1).split("__")
    when = datetime.datetime.fromtimestamp(os.stat("sam.results").st_mtime).strftime("%Y %b %d %H:%M:%S")

    c.executemany("INSERT INTO Signatures VALUES (?, ?, ?, ?, ?, ?, ?, ? )", (dir, "IPLS", "Superpathway 2.0", when, cancertype,  featuretype,  phenotypeclass,  feature))
    id = c.lastrowid

    for line in open("sam.report"):
	words = line[:-1].split("\t")
	sample, posNeg, zeroOne = words
	c.execute("INSERT INTO Samples VALUES (?, ?, ?)", (sample, id, zeroOne))

    for line in open("sam.results"):
	words = line[:-1].split("\t")
	k = len(words)
	if k == 6:
	    name, dscore, falseCalls, qValue, pValue, stddev = words
	elif k == 7:
	    name, ignore, dscore, falseCalls, qValue, pValue, stddev = words
	else:
	    print len(line[:-1].split("\t")),  dir, line[:-1].split("\t"),  line
	    sys.exit(1)

	if dscore == 'NA'or dscore == '': dscore = 0.0 
	else: dscore = float(dscore)
	if falseCalls == 'NA'or falseCalls == '': falseCalls = 0.0 
	else: falseCalls = float(falseCalls)
	if qValue == 'NA'or qValue == '': qValue = 0.0 
	else: qValue = float(qValue)
	if pValue == 'NA'or pValue == '': pValue = 0.0 
	else: pValue = float(pValue)
	if stddev == 'NA'or stddev == '': stddev = 0.0 
	else: stddev = float(stddev)

	c.execute("INSERT INTO Data VALUES (?, ?, ?, ?, ?, ?, ?)", (id, name, dscore, falseCalls, qValue, pValue, stddev));


"eXtract database into a TSV file"

def extract(conn, options):
    f = options.database + ".numpyCache.npz"
    d = numpy.load(f);
    SigArray=d["SigArray"]
    FeatureMap=d["FeatureMap"]
    FeatureMap = FeatureMap.reshape(-1)[0]
    mSigs,nFeatures = SigArray.shape

    out = open(options.extract, "w")
    out.write("id")
    if options.verbose: sys.stderr.write( options.restrict + " restriction \n")
    rowid_dir_array  = conn.execute("SELECT rowid,dir FROM Signatures where dir REGEXP ? ORDER BY rowid", (options.restrict,)).fetchall()
    for rowid, dir in rowid_dir_array:
        out.write("\t"+dir)
    out.write("\n")

    for name, index in sorted(FeatureMap.items()):
	out.write(name)
        for rowid, dir in rowid_dir_array:
	    out.write("\t"+str(SigArray[rowid, index]))
	out.write("\n")
    out.close()


def loadDIPSCinventory(conn, inventory):
    c = conn.cursor()

    for line in open(inventory):
	dir = line[:-1]
	sigMaker(c, dir)
	conn.commit()

def regexp(expr, item):
    reg = re.compile(expr)
    return reg.search(item) is not None


def main(argv):
    parser = optparse.OptionParser()
    parser.add_option("-a", "--algorithms", type=str, help="one or more of dot,pearson,spearman,kendall separated by comma ,", dest="algorithms")
    parser.add_option("-c", "--challenge", type=str, help="specify samples that are to be challenged", dest="challenge")
    parser.add_option("-d", "--database", type=str, help="specify database to be used, defaults to signature.db", dest="database", default="signature.db")
    parser.add_option("-g", "--generate", action="store_true",  help="generate numpy cache", dest="generate")
    parser.add_option("-l", "--loadDIPSCinventory", type=str, help="load DIPSC inventory", dest="load")
    parser.add_option("-R", "--restrict",  help="restrict ot signatures that match this pattern", default=".*", dest="restrict")
    parser.add_option("-r", "--results",  help="output results database", default=":memory:", dest="results")
    parser.add_option("-i", "--inputResults",  help="", dest="inputResults")
    parser.add_option("-x", "--extract",  help="eXtract database into a extract file (may be used with --restrict)" ,  dest="extract")
    parser.add_option("-v", "--verbose", action="store_true", help="increase output verbosity", dest="verbose")

    (options, args) = parser.parse_args()

    if options.load:
	if options.verbose: sys.stderr.write("Loading " + options.load +"\n")
    	loadDIPSCinventory(conn, options.load)

    if options.challenge:
	if options.verbose: sys.stderr.write("Challenging " + options.challenge +"\n")
        sigChallenge(options.challenge, conn, options)

    if options.inputResults:
        if options.verbose: sys.stderr.write("Inserting Results " + options.inputResults + " Into "+ options.results +"\n")
        insertResults(options.inputResults, conn, options)
    if options.generate:
	if options.verbose: sys.stderr.write("Generate database " + options.generate + "\n")
	generate(conn, options)

    if options.extract:
	if options.verbose: sys.stderr.write("Extract into tab seperated value (tsv) file" + options.extract + "\n")
	extract(conn, options)

    if options.verbose: sys.stderr.write("closing database\n")
    conn.close()

if __name__ == "__main__":
    main(sys.argv)

