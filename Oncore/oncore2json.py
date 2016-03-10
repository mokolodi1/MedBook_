#!/System/Library/Frameworks/Python.framework/Versions/2.7/Resources/Python.app/Contents/MacOS/Python
# Copyright (c) 2005-2012 Stephen John Machin, Lingfo Pty Ltd
# This script is part of the xlrd package, which is released under a
# BSD-style licence.

from __future__ import print_function

cmd_doc = """
Commands:

oncore          Convert oncore export xls to json files per patient
2rows           Print the contents of first and last row in each sheet
3rows           Print the contents of first, second and last row in each sheet
bench           Same as "show", but doesn't print -- for profiling
biff_count[1]   Print a count of each type of BIFF record in the file
biff_dump[1]    Print a dump (char and hex) of the BIFF records in the file
fonts           hdr + print a dump of all font objects
hdr             Mini-overview of file (no per-sheet information)
hotshot         Do a hotshot profile run e.g. ... -f1 hotshot bench bigfile*.xls
labels          Dump of sheet.col_label_ranges and ...row... for each sheet
name_dump       Dump of each object in book.name_obj_list
names           Print brief information for each NAME record
ov              Overview of file
profile         Like "hotshot", but uses cProfile
show            Print the contents of all rows in each sheet
version[0]      Print versions of xlrd and Python and exit
xfc             Print "XF counts" and cell-type counts -- see code for details

[0] means no file arg
[1] means only one file arg i.e. no glob.glob pattern
"""

options = None
if __name__ == "__main__":

    PSYCO = 0
    sample_list = {}  # dictionary for each sample containing a dictionary with key,value pairs for each column
                     # i.e. sample_list[sample][attribute] = cell_value
    col_index = {}   # dictionary for each sheet containing an array of column names indexed by column number. 
                     # ie. col_index[sheet][3] = 'Treatment Start Date'

    domain_map = {} # dictionary for datatype containing valid values and mapping to other values (in case of drug names)
    import pdb
    import xlrd
    import sys, time, glob, traceback, gc
    import os
    import zipfile
    #import time
    
    from xlrd.timemachine import xrange, REPR
    from bson import json_util
    import json 
    from datetime import datetime
    #from datetime import strptime
    import subprocess
    from dateutil import rrule
    #import datetime
    

    class LogHandler(object):

        def __init__(self, logfileobj):
            self.logfileobj = logfileobj
            self.fileheading = None
            self.shown = 0
            
        def setfileheading(self, fileheading):
            self.fileheading = fileheading
            self.shown = 0
            
        def write(self, text):
            if self.fileheading and not self.shown:
                self.logfileobj.write(self.fileheading)
                self.shown = 1
            self.logfileobj.write(text)
        
    null_cell = xlrd.empty_cell

    def weeks_between(start_date, end_date):
        print ('types ', type(start_date), type(end_date))
        assert(isinstance(start_date, datetime))
        assert(isinstance(end_date, datetime))
        if end_date == "":
            return 999
        # return number of weeks between two dates
        weeks = rrule.rrule(rrule.WEEKLY, dtstart=start_date, until=end_date)
        return weeks.count()

    def parse_date(in_date):
        print('    #parse date ',in_date, type(in_date))
        if isinstance(in_date, tuple):
            return datetime(in_date[0], in_date[1], in_date[2], in_date[3], in_date[4])
        if isinstance(in_date, dict):
            ret_date = in_date['date']
            s_date = ret_date.strftime('%Y %m %d')
        if isinstance(in_date, datetime):
            ret_date = in_date
            s_date = ret_date.strftime('%Y %m %d')
            return s_date
        try:
            if len(in_date) > 5:
                if in_date[0] == '(' and in_date[-1] == ')':
                    ret_date= datetime.strptime(in_date,'(%Y, %m, %d, %H, %M, %S)')
                else:
                    ret_date= datetime.strptime(in_date,'%Y-%m-%d %H:%M:%S')
                s_date = ret_date.strftime('%Y %m %d')
            else:
                return
        except ValueError: 
            try:
                ret_date = datetime.strptime(in_date, '%m/%d/%Y').strftime('%Y,%m,%d')
            except ValueError:
                try:
                    ret_date = datetime.strptime(in_date, '%m/00/%Y').strftime('%Y,%m,01')
                except ValueError:
                    try:
                        ret_date = datetime.strptime(in_date, '00/00/%Y').strftime('%Y,01,01')
                    except ValueError:
                        return
            s_date = ret_date.strftime('%Y %m %d')
        return s_date

    def parse_date_both(in_date, date_ext):
        print('    #parse date both',in_date, date_ext)
        print('    #parse date both',in_date, type(in_date), date_ext)
        try:
            if isinstance(in_date, tuple):
                ret_date = datetime(in_date[0], in_date[1], in_date[2], in_date[3], in_date[4])
                s_date = datetime(in_date[0], in_date[1], in_date[2], in_date[3], in_date[4])
                #s_date = ret_date.strftime('%Y %m %d')
                return s_date, ret_date
            else:
                if isinstance(in_date, datetime):
                    s_date = in_date.strftime('%Y %m %d')
                    return s_date, in_date
                elif isinstance(in_date, dict):
                    ret_date = in_date['date']
                    s_date = ret_date.strftime('%Y %m %d')
                    print('    #parse dict ret',s_date, type(s_date), ret_date, type(ret_date))
                    return s_date, ret_date
                if len(in_date) > 5:
                    if in_date[0] == '(' and in_date[-1] == ')':
                        ret_date= datetime.strptime(in_date,'(%Y, %m, %d, %H, %M, %S)')
                    else:
                        ret_date= datetime.strptime(in_date,'%Y-%m-%d %H:%M:%S')
                    s_date = ret_date.strftime('%Y %m %d')
                else:
                    return
        except ValueError: 
            try:
                ret_date = datetime.strptime(in_date, '%m/%d/%Y').strftime('%Y,%m,%d')
            except ValueError:
                try:
                    ret_date = datetime.strptime(in_date, '%m/00/%Y').strftime('%Y,%m,01')
                except ValueError:
                    try:
                        ret_date = datetime.strptime(in_date, '00/00/%Y').strftime('%Y,01,01')
                    except ValueError:
                        if date_ext == 'Ongoing':
                            return
                        return
            s_date = ret_date.strftime('%Y %m %d')
        print('    #parse ret',s_date, type(s_date), ret_date, type(ret_date))
        return s_date, ret_date

    def convert_col(rowx, colx, key , ty, val, printit, convert, sheet, subdocument, sample_id):
        if colx == 0:
            if not sample_list.has_key(sample_id):
                sample_list[sample_id] = { 'patient': sample_id, 'attributes': {}, "timeline": {"date": [], "startDate": "2008,01,01", "headline": "Patient Timeline for "+sample_id, "type":"default", "text": "Description "+sample_id }, 'forms': {} }
                #if printit:
                #    print("    MT sample_id: %s value: %r" % (sample_id, sample_list))
            if printit:
                print("sample_id: %s row %d col_index %s" % (sample_id, rowx, REPR(col_index[sheet])))
                #print("sample_id: %s sample_list %r" % (sample_id, REPR(sample_list)))
        if key == 'Birth Date':
            val = 'protected'
        if printit:
            print("   row: %d col: %d key: %s value: %r" % (rowx, colx,key, val))
        if key == 'Sequence No.' or key == 'Level' or key == 'Cycle' or key == 'Not Applicable or Missing': # skip unused attributes
            return
        if key == 'Form' or key == 'Form Desc.' or key == 'Form Status' or key == 'Initials': # insert forms
            if not sample_list[sample_id]['forms'].has_key(sheet):
                sample_list[sample_id]['forms'][sheet] = {}
            sample_list[sample_id]['forms'][sheet][key] = val
            return
        else: # insert attributes
            try: 
                #val = datetime.strptime(val, '%m/%d/%Y').strftime('%Y,%m,%d')
                #print('#SHEET',sheet,' type',ty, 'key',key)
                if ty==3:
                    #if sheet == 'Demographics':
                    #    pdb.set_trace()
                    sdate = str(val[0])+'/'+str(val[1])+'/'+str(val[2])
                    val = datetime(val[0], val[1], val[2], val[3], val[4])
            except ValueError:
                print('#DATEERROR', val, sample_id)
                try:
                    val = datetime.strptime(val, '%m/00/%Y').strftime('%Y,%m,01')
                except ValueError:
                    try:
                        val = datetime.strptime(val, '00/00/%Y').strftime('%Y,01,01')
                    except ValueError:
                        pass
            except TypeError:
                if printit:
                    print("not a date, converting to string" , val)
                val = str(val)

            if printit:
                try:
                    print("Patient %s col heading %s " % (sample_id, col_index[sheet][colx+1]))
                except:
                    pass
            return val

    def show_row(bk, sh, rowx, colrange, printit, convert=0, sheet="", main_sheet =""):
        if bk.ragged_rows:
            colrange = range(sh.row_len(rowx))
        if not colrange: return
        if printit: print()
        if bk.formatting_info:
            for colx, ty, val, cxfx in get_row_data(bk, sh, rowx, colrange):
                if printit:
                    print("cell %s%d: row:%d type=%d, data: %r, xfx: %s"
                        % (xlrd.colname(colx), rowx+1, rowx+1, ty, val, cxfx))
        else:
            prev_sheet = ""
            subdocument = False
            sheet_type = 'Data'
            if sheet == 'Past Tissue V1' :
                subdocument = True
            elif sheet == 'ECOG-Weight V2' :
                subdocument = True
            elif sheet == 'ECOG-Weight V3' :
                subdocument = True
            elif sheet == 'Blood Labs V2' :
                subdocument = True
            elif sheet == 'GU-Disease Assessment V3' :
                subdocument = True
            elif sheet == 'SU2C Biopsy AE V1' :
                subdocument = True
            elif sheet == 'SU2C Biopsy V2' :
                subdocument = True
            elif sheet == 'SU2C Biopsy V3' :
                subdocument = True
            elif sheet == 'SU2C Pr Ca Tx Sumry V2' :
                subdocument = True
            elif sheet == 'SU2C Prior TX V2' :
                subdocument = True
            elif sheet == 'SU2C Prior TX V3' :
                subdocument = True
            elif sheet == 'SU2C Specimen V1' :
                subdocument = True
            elif sheet == 'SU2C Subsequent TX V2' :
                subdocument = True
            elif sheet == 'SU2C Subsequent Treatment V1' :
                subdocument = True
            elif sheet == 'SU2C Tissue Report V1' :
                subdocument = True
            elif sheet == 'Demographics' :
                subdocument = False
            elif sheet == 'Followup' :
                subdocument = False
            elif sheet == 'Prostate Diagnosis V4' :
                subdocument = False
            elif sheet == 'Domains' :
                sheet_type = sheet
                sheet = main_sheet
                subdocument = False
            elif sheet == 'Format' :
                sheet_type = sheet
                sheet = main_sheet
                subdocument = False
            else:
                print("#ERROR unknown form ", sheet)
                pdb.set_trace()
            j_row = {}
            for colx, ty, val, _unused in get_row_data(bk, sh, rowx, colrange):
                if printit:
                    print("cell %s%d: type=%d, data: %r" % (xlrd.colname(colx), rowx+1, ty, val))
                if sheet_type == 'Format':
                    print("Format cell %s%d: type=%d, data: %r" % (xlrd.colname(colx), rowx+1, ty, val))
                if sheet_type == 'Domains':
                    print("Domain sheet %s cell %s %d: type=%d, data: %r" % (sheet, xlrd.colname(colx), rowx+1, ty, val))
                    #if sheet == 'SU2C Prior TX V3':
                    #    pdb.set_trace()
                if convert:
                    if colx == 0:
                        if val > 0 and val <> '':
                            sample_id = "DTB-"+str(val)
                        else:
                            sample_id = "DTB-MISSING"
                    if rowx == 0:
                        col_index[sheet].append(val)
                    else:
                        key = col_index[sheet][colx]
                        d = convert_col(rowx, colx, key, ty, val, printit, convert, sheet, subdocument, sample_id)
                        if d:
                            if sheet_type == 'Domains':
                                print("Domain sheet %s cell %s %d: type=%d, data: %r" % (sheet, xlrd.colname(colx), rowx+1, ty, val))
                                if val == u'DRUG':
                                    if u'DRUG' not in domain_map:
                                        domain_map[u'DRUG'] = {}
                                    print('#drug', d)
                                    domain_map[u'DRUG']['test'] = d
                            if sheet_type == 'Data':
                                if not sample_list[sample_id]['attributes'].has_key(sheet):
                                    if subdocument:
                                        sample_list[sample_id]['attributes'][sheet] = []
                                    else:
                                        sample_list[sample_id]['attributes'][sheet] = {}
                                        #if printit:
                                        #    print("    MT sample_id: %s value: %r" % (sample_id, sample_list))
                                print("#SHEET",sheet, sample_id, key, '=', val)
                                if subdocument:
                                    j_row[key] = d
                                else:
                                    if not sample_list[sample_id]['attributes'][sheet].has_key(key) :
                                        sample_list[sample_id]['attributes'][sheet][key] = d
                                    else:
                                        print("#ERROR value already stored ", sample_id, "sheet", sheet, "key", key, "val", val)
                                        pdb.set_trace()
            if convert and rowx > 0 and sheet_type == 'Data':
                if subdocument:
                    print ('#add subdoc ', sample_id, 'sheet', sheet, 'j_row', j_row)
                    if (sheet != 'SU2C Biopsy V3' or (sheet == 'SU2C Biopsy V3' and u'Date of Procedure' in j_row)): 

                        sample_list[sample_id]['attributes'][sheet].append(j_row)
                    else:
                        print("#skipped blank biopsy" , sample_id, j_row)
            if sheet_type == 'Data':
                prev_sheet = sheet

    def get_row_data(bk, sh, rowx, colrange):
        result = []
        dmode = bk.datemode
        ctys = sh.row_types(rowx)
        cvals = sh.row_values(rowx)
        for colx in colrange:
            cty = ctys[colx]
            cval = cvals[colx]
            if bk.formatting_info:
                cxfx = str(sh.cell_xf_index(rowx, colx))
            else:
                cxfx = ''
            if cty == xlrd.XL_CELL_DATE:
                try:
                    showval = xlrd.xldate_as_tuple(cval, dmode)
                except xlrd.XLDateError:
                    e1, e2 = sys.exc_info()[:2]
                    showval = "%s:%s" % (e1.__name__, e2)
                    cty = xlrd.XL_CELL_ERROR
            elif cty == xlrd.XL_CELL_ERROR:
                showval = xlrd.error_text_from_code.get(cval, '<Unknown error code 0x%02x>' % cval)
            else:
                showval = cval
            result.append((colx, cty, showval, cxfx))
        return result

    def bk_header(bk):
        print()
        print("BIFF version: %s; datemode: %s"
            % (xlrd.biff_text_from_num[bk.biff_version], bk.datemode))
        print("codepage: %r (encoding: %s); countries: %r"
            % (bk.codepage, bk.encoding, bk.countries))
        print("Last saved by: %r" % bk.user_name)
        print("Number of data sheets: %d" % bk.nsheets)
        print("Use mmap: %d; Formatting: %d; On demand: %d"
            % (bk.use_mmap, bk.formatting_info, bk.on_demand))
        print("Ragged rows: %d" % bk.ragged_rows)
        if bk.formatting_info:
            print("FORMATs: %d, FONTs: %d, XFs: %d"
                % (len(bk.format_list), len(bk.font_list), len(bk.xf_list)))
        if not options.suppress_timing:        
            print("Load time: %.2f seconds (stage 1) %.2f seconds (stage 2)"
                % (bk.load_time_stage_1, bk.load_time_stage_2))
        print()

    def show_fonts(bk):
        print("Fonts:")
        for x in xrange(len(bk.font_list)):
            font = bk.font_list[x]
            font.dump(header='== Index %d ==' % x, indent=4)

    def show_names(bk, dump=0):
        bk_header(bk)
        if bk.biff_version < 50:
            print("Names not extracted in this BIFF version")
            return
        nlist = bk.name_obj_list
        print("Name list: %d entries" % len(nlist))
        for nobj in nlist:
            if dump:
                nobj.dump(sys.stdout,
                    header="\n=== Dump of name_obj_list[%d] ===" % nobj.name_index)
            else:
                print("[%d]\tName:%r macro:%r scope:%d\n\tresult:%r\n"
                    % (nobj.name_index, nobj.name, nobj.macro, nobj.scope, nobj.result))

    def print_labels(sh, labs, title):
        if not labs:return
        for rlo, rhi, clo, chi in labs:
            print("%s label range %s:%s contains:"
                % (title, xlrd.cellname(rlo, clo), xlrd.cellname(rhi-1, chi-1)))
            for rx in xrange(rlo, rhi):
                for cx in xrange(clo, chi):
                    print("    %s: %r" % (xlrd.cellname(rx, cx), sh.cell_value(rx, cx)))

    def show_labels(bk):
        # bk_header(bk)
        hdr = 0
        for shx in range(bk.nsheets):
            sh = bk.sheet_by_index(shx)
            clabs = sh.col_label_ranges
            rlabs = sh.row_label_ranges
            if clabs or rlabs:
                if not hdr:
                    bk_header(bk)
                    hdr = 1
                print("sheet %d: name = %r; nrows = %d; ncols = %d" %
                    (shx, sh.name, sh.nrows, sh.ncols))
                print_labels(sh, clabs, 'Col')
                print_labels(sh, rlabs, 'Row')
            if bk.on_demand: bk.unload_sheet(shx)

    def show(bk, nshow=65535, printit=1, convert=0):
        sheet_name = ""
        if printit:
            bk_header(bk)
        if 0:
            rclist = xlrd.sheet.rc_stats.items()
            rclist = sorted(rclist)
            print("rc stats")
            for k, v in rclist:
                print("0x%04x %7d" % (k, v))
        print("#options: ", options.onesheet)
        if (options.onesheet):
            try:
                shx = int(options.onesheet)
            except ValueError:
                shx = bk.sheet_by_name(options.onesheet).number
            shxrange = [shx]
            print("number of sheets: 1", shx)
        else:
            shxrange = range(bk.nsheets)
            print("number of sheets:", bk.nsheets)
        for shx in shxrange:
            sh = bk.sheet_by_index(shx)
            main_sheet_obj = bk.sheet_by_index(0)
            nrows, ncols = sh.nrows, sh.ncols
            colrange = range(ncols)
            anshow = min(nshow, nrows)
            if printit:
                print("sheet %d: name = %s; nrows = %d; ncols = %d" %
                    (shx, REPR(sh.name), sh.nrows, sh.ncols))
            if convert:
                sheet_name = sh.name
                main_sheet = main_sheet_obj.name
                #sample_list[sheet_name] = dict()
                col_index[sheet_name] = []
            if nrows and ncols:
                # Beat the bounds
                for rowx in xrange(nrows):
                    nc = sh.row_len(rowx)
                    if nc:
                        _junk = sh.row_types(rowx)[nc-1]
                        _junk = sh.row_values(rowx)[nc-1]
                        _junk = sh.cell(rowx, nc-1)
            for rowx in xrange(anshow-1):
                if not printit and rowx % 10000 == 1 and rowx > 1:
                    print("done %d rows" % (rowx-1,))
                show_row(bk, sh, rowx, colrange, printit, convert, sheet=sheet_name, main_sheet=main_sheet)
            if anshow and nrows:
                show_row(bk, sh, nrows-1, colrange, printit, convert, sheet=sheet_name, main_sheet=main_sheet)
            if printit:
                print()
            if bk.on_demand: bk.unload_sheet(shx)

    def count_xfs(bk):
        bk_header(bk)
        for shx in range(bk.nsheets):
            sh = bk.sheet_by_index(shx)
            nrows, ncols = sh.nrows, sh.ncols
            print("sheet %d: name = %r; nrows = %d; ncols = %d" %
                (shx, sh.name, sh.nrows, sh.ncols))
            # Access all xfindexes to force gathering stats
            type_stats = [0, 0, 0, 0, 0, 0, 0]
            for rowx in xrange(nrows):
                for colx in xrange(sh.row_len(rowx)):
                    xfx = sh.cell_xf_index(rowx, colx)
                    assert xfx >= 0
                    cty = sh.cell_type(rowx, colx)
                    type_stats[cty] += 1
            print("XF stats", sh._xf_index_stats)
            print("type stats", type_stats)
            print()
            if bk.on_demand: bk.unload_sheet(shx)

    def process_file(fname, cmd):
        global PSYCO
        if options.logfilename:
            logfile = LogHandler(open(options.logfilename, 'w'))
        else:
            logfile = sys.stdout
        if options.output:
            html_output = options.output
        mmap_opt = options.mmap
        mmap_arg = xlrd.USE_MMAP
        if mmap_opt in (1, 0):
            mmap_arg = mmap_opt
        elif mmap_opt != -1:
            print('Unexpected value (%r) for mmap option -- assuming default' % mmap_opt)
        fmt_opt = options.formatting | (cmd in ('xfc', ))
        gc_mode = options.gc
        if gc_mode:
            gc.disable()
        logfile.write("=== FILE: %s ===\n" % fname)
        if logfile != sys.stdout:
            logfile.setfileheading("\n=== File: %s ===\n" % fname)
        if gc_mode == 1:
            n_unreachable = gc.collect()
            if n_unreachable:
                print("GC before open:", n_unreachable, "unreachable objects")
        if PSYCO:
            import psyco
            psyco.full()
            PSYCO = 0
        try:
            t0 = time.time()
            bk = xlrd.open_workbook(fname,
                verbosity=options.verbosity, logfile=logfile,
                use_mmap=mmap_arg,
                encoding_override=options.encoding,
                formatting_info=fmt_opt,
                on_demand=options.on_demand,
                ragged_rows=options.ragged_rows,
                )
            t1 = time.time()
            if not options.suppress_timing:
                print("Open took %.2f seconds" % (t1-t0,))
        except xlrd.XLRDError:
            e0, e1 = sys.exc_info()[:2]
            print("*** Open failed: %s: %s" % (e0.__name__, e1))
            return
        except KeyboardInterrupt:
            print("*** KeyboardInterrupt ***")
            traceback.print_exc(file=sys.stdout)
            sys.exit(2)
        except:
            e0, e1 = sys.exc_info()[:2]
            print("*** Open failed: %s: %s" % (e0.__name__, e1))
            traceback.print_exc(file=sys.stdout)
            return
        t0 = time.time()
        if cmd == 'hdr':
            bk_header(bk)
        elif cmd == 'ov': # OverView
            show(bk, 0)
        elif cmd == 'oncore': # convert all rows to json docs per sample
            show(bk, printit=0, convert=1)
        elif cmd == 'oncore-debug': # convert all rows to json docs per sample
            show(bk, printit=1, convert=1)
        elif cmd == 'show': # all rows
            show(bk)
        elif cmd == '2rows': # first row and last row
            show(bk, 2)
        elif cmd == '3rows': # first row, 2nd row and last row
            show(bk, 3)
        elif cmd == 'bench':
            show(bk, printit=0)
        elif cmd == 'fonts':
            bk_header(bk)
            show_fonts(bk)
        elif cmd == 'names': # named reference list
            show_names(bk)
        elif cmd == 'name_dump': # named reference list
            show_names(bk, dump=1)
        elif cmd == 'labels':
            show_labels(bk)
        elif cmd == 'xfc':
            count_xfs(bk)
        else:
            print("*** Unknown command <%s>" % cmd)
            sys.exit(3)
        del bk
        if gc_mode == 1:
            n_unreachable = gc.collect()
            if n_unreachable:
                print("GC post cmd:", fname, "->", n_unreachable, "unreachable objects")
        if not options.suppress_timing:
            t1 = time.time()
            print("\ncommand took %.2f seconds\n" % (t1-t0,))

    def main(cmd_args):
        import optparse
        import shutil
        global options, PSYCO
        usage = "\n%prog [options] command [input-file-patterns]\n" + cmd_doc
        oparser = optparse.OptionParser(usage)
        tool_root = os.path.dirname(os.path.realpath(__file__))
        oparser.add_option(
            "-l", "--logfilename",
            default="",
            help="contains error messages")
        oparser.add_option(
            "-o", "--output",
            default="clinical.html",
            help="location of output html ")
        oparser.add_option(
            "-c", "--cohort",
            default="cohort.json",
            help="location of output html ")
        oparser.add_option(
            "-d", "--directory",
            help="location of output json ")
        oparser.add_option(
            "-v", "--verbosity",
            type="int", default=0,
            help="level of information and diagnostics provided")
        oparser.add_option(
            "-m", "--mmap",
            type="int", default=-1,
            help="1: use mmap; 0: don't use mmap; -1: accept heuristic")
        oparser.add_option(
            "-e", "--encoding",
            default="",
            help="encoding override")
        oparser.add_option(
            "-f", "--formatting",
            type="int", default=0,
            help="0 (default): no fmt info\n"
                 "1: fmt info (all cells)\n"
            )
        oparser.add_option(
            "-g", "--gc",
            type="int", default=0,
            help="0: auto gc enabled; 1: auto gc disabled, manual collect after each file; 2: no gc")
        oparser.add_option(
            "-s", "--onesheet",
            default="",
            help="restrict output to this sheet (name or index)")
        oparser.add_option(
            "-u", "--unnumbered",
            action="store_true", default=0,
            help="omit line numbers or offsets in biff_dump")
        oparser.add_option(
            "-n", "--on-demand",
            action="store_true", default=0,
            help="load sheets on demand instead of all at once")
        oparser.add_option(
            "-t", "--suppress-timing",
            action="store_true", default=1,
            help="don't print timings (diffs are less messy)")
        oparser.add_option(
            "-r", "--ragged-rows",
            action="store_true", default=0,
            help="open_workbook(..., ragged_rows=True)")
        options, args = oparser.parse_args(cmd_args)
        if len(args) == 1 and args[0] in ("version", ):
            pass
        elif len(args) < 2:
            oparser.error("Expected at least 2 args, found %d" % len(args))
        cmd = args[0]
        print("options: ", options)
        xlrd_version = getattr(xlrd, "__VERSION__", "unknown; before 0.5")
        if cmd == 'biff_dump':
            xlrd.dump(args[1], unnumbered=options.unnumbered)
            sys.exit(0)
        if cmd == 'biff_count':
            xlrd.count_records(args[1])
            sys.exit(0)
        if cmd == 'version':
            print("xlrd: %s, from %s" % (xlrd_version, xlrd.__file__))
            print("Python:", sys.version)
            sys.exit(0)
        for pattern in args[1:]:
            for fname in glob.glob(pattern):
                if zipfile.is_zipfile(fname):
                    zf = zipfile.ZipFile(fname)
                    for info in zf.infolist():
                        print("file from zip ",info.filename)
                        try:
                            data = zf.read(info.filename)
                            try:
                                os.stat(options.directory)
                            except:
                                os.mkdir(options.directory)       
                            filename = options.directory+"/"+info.filename
                        except Exception, e:
                            print("error opening file", info.filename, e)
                        try:
                            wf = open(filename, "w")
                            wf.write(data)
                            wf.close()
                        except Exception, e:
                            print("error writing file", filename, e)
                        #try:
                        process_file(filename, cmd)
                        #except Exception, e:
                        #    print("error processing file", filename, "cmd", cmd, e)
                else:
                    process_file(fname, cmd)
        print('\n#DONE READING FILE.\n  #Start writing json\n\n')
        if cmd == 'oncore':
            # create events 
            html_output = options.output
            cohort_output = options.cohort
            if options.directory:
                print ('\nWriting to directory'+options.directory)
                if not os.path.exists(options.directory):
                   # makedirs is the right thing to use here: recursive
                   os.makedirs(options.directory)
                cohort_file = options.directory+"/"+cohort_output
                summary_file = options.directory+"/summary.html"
            else:
                cohort_file = cohort_output
                summary_file = "summary.html"
            cohort = open(cohort_file, 'w')
            oncore_out = open('clinical_oncore.json', 'w')
            print ('\nWriting all json to '+cohort_file+'.')
            all = open(html_output, 'w')
            print ('Writing html to '+html_output+'.')
            all.write("<html>\n")
            all.write("<body>\n")
            all.write("<h1>West Coast Dream Team Clinical Data loaded from OnCore</h1>\n<br>")
            all.write("<table>\n")
            all.write("<tr><td><a href='%s'>%s</a></td></tr>\n" 
                        %("cohort.json",  "cohort.json"))
            for sample in sorted(sample_list.keys()):
                print(">>sample start:",sample)
                firstBiopsy = None
                for key in sample_list[sample]['attributes'].keys():
                    form = sample_list[sample]['attributes'][key]
                    print("\n#key:",key," form: ", form)
                    key_found = False
                    if key =='SU2C Pr Ca Tx Sumry V2':
                        """ {
                        u'Radiation Therapy': u'No', 
                        u'Visit Date': '2013,02,13', 
                        u'Radical Prostatectomy': u'No', 
                        u'Start Date_EXT': u'', 
                        u'Stop Date_EXT': u'', 
                        u'Day': u'1', 
                        u'Surgery Date_EXT': u'', 
                        u'Stop Date': u'', 
                        u'Phase': u'Treatment', 
                        u'Start Date': u'', 
                        u'Segment': u'Screening ', 
                        u'Arm': u'', 
                        u'Surgery Date': u''
                        }"""
                        event = {}
                        key_found = True
                        if isinstance(form, list):
                            for index, f in enumerate(form):
                                event = {}
                                continue
                                start_date_ext = f['Start Date Ext']
                                if len(start_date) > 5:
                                    event['startDate'] = start_date
                                    event['startDateExt'] = start_date_ext
                                try:
                                    print("start_date:",start_date)
                                    #start_date_dt = datetime.strptime(start_date.replace(","," "), '%Y %m %d')
                                    start_date_dt = datetime.strptime(start_date.replace(","," "),'%Y %m %d %H %M %S' )
                                except ValueError:
                                    print("start_date:",start_date)
                                    start_date_dt = ""
                                    pass
                                stop_date_ext = f['Stop Date Ext']
                                if len(f['Stop Date']) > 5:
                                    stop_date = f['Stop Date'].replace("(","").replace(")","")
                                try:
                                    stop_date_dt = datetime.strptime(stop_date.replace(","," "), '%Y %m %d %H %M %S' )
                                    #stop_date_dt = datetime.strptime(stop_date.replace(","," "), '%Y %m %d')
                                except ValueError:
                                    stop_date_dt = ""
                                    pass
                                weeks_num = weeks_between(start_date_dt, stop_date_dt)
                                if weeks_num > 900:
                                    weeks_diff = "Unknown"
                                else:
                                    weeks_diff = str(weeks_num)+" weeks"
                                    if weeks_diff == 1:
                                        weeks_diff = str(weeks_num)+" week"
				if len(start_date) > 2:
				    event['startDate'] = start_date
				else:
				    event['startDate'] = f[u'Visit Date']
				if len(stop_date) > 3:
				    event['stopDate'] = stop_date
				event['headline'] = "Radiation/Surgery Summary"
				surgery_date = f[u'Surgery Date']
				if len(surgery_date) < 2:
				    surgery_date = f[u'Surgery Date_EXT']
				event['text'] = "<p>Radiation Therapy: <b>"+f[u'Radiation Therapy']+"</b>  Duration of Radiation: <b>"+weeks_diff+"</b><p>Radical Prostatectomy: <b>"+f[u'Radical Prostatectomy']+" </b>  Surgery Date: <b>"+surgery_date.replace(","," ")+"</b><p>Phase: <b>"+f[u'Phase'] +"</b>"
				event['tag'] = "Diagnosis"
				event['asset'] = {}
                                sample_list[sample]['timeline']['date'].append(event)
			else:
                                start_date_ext = form['Start Date Ext']
				if len(form['Start Date']) > 5:
				    start_date = form['Start Date'].replace("(","").replace(")","")
                                    try:
                                        print("###start_date:",start_date)
                                        #start_date_dt = datetime.strptime(start_date.replace(","," "), '%Y %m %d')
                                        start_date_dt = datetime.strptime(start_date.replace(","," "),'%Y %m %d %H %M %S' )
                                    except ValueError:
                                        print("start_date:",start_date)
                                        start_date_dt = ""
                                        pass
                                else:
                                    start_date_dt = ""
                                    start_date = ""
                                stop_date_ext = form['Stop Date Ext']
				if len(form['Stop Date']) > 5:
				    stop_date = form['Stop Date'].replace("(","").replace(")","")
                                    try:
                                        #stop_date_dt = datetime.strptime(stop_date.replace(","," "), '%Y %m %d')
                                        stop_date_dt = datetime.strptime(stop_date.replace(","," "), '%Y %m %d %H %M %S' )
                                    except ValueError:
                                        print("##stop_date", stop_date, " form ", form)
                                        stop_date_dt = ""
                                        pass
                                else:
                                    stop_date_dt = ""
                                    stop_date = ""
				weeks_num = weeks_between(start_date_dt, stop_date_dt)
				if weeks_num > 900:
				    weeks_diff = "Unknown"
				else:
				    weeks_diff = str(weeks_num)+" weeks"
				    if weeks_diff == 1:
					weeks_diff = str(weeks_num)+" week"
                                try:
                                    if len(start_date) > 2:
                                        event['startDate'] = start_date
                                    else:
                                        event['startDate'] = form[u'Visit Date']
                                except:
                                    event['startDate'] = form[u'Visit Date']
                                try:
                                    if len(stop_date) > 3:
                                        event['stopDate'] = stop_date
                                except:
                                    event['stopDate'] = event['startDate'] 
				event['headline'] = "Radiation/Surgery Summary"
				surgery_date = form[u'Surgery Date']
				if len(surgery_date) < 2:
				    surgery_date = form[u'Surgery Date Ext']
				event['text'] = "<p>Radiation Therapy: <b>"+form[u'Radiation Therapy']+"</b>  Duration of Radiation: <b>"+weeks_diff+"</b><p>Radical Prostatectomy: <b>"+form[u'Radical Prostatectomy']+" </b>  Surgery Date: <b>"+surgery_date.replace(","," ")+"</b><p>Phase: <b>"+form[u'Phase'] +"</b>"
				event['tag'] = "Diagnosis"
				event['asset'] = {}
				sample_list[sample]['timeline']['date'].append(event)
                                pdb.set_trace()
				continue
                    if key =='Followup':
                        """ {
                        Sequence No.    Initials    Followup Center Followup Start Date Off Treatment Date  Off Treatment Reason    Off Treatment Reason Explain    Expired Date    Off Study Reason    Off Study Reason Explain    Best Response   Best Response Date  Best Response Confirm   QA Date Last Followup Date  Last Known Survival Status  Date of Progression
                        u'Best Response Date': u'', 
                        u'Followup Center': u'Mt. Zion', 
                        u'QA Date': u'', 
                        u'Last Followup Date': u'', 
                        u'Off Treatment Date': '2013,05,22', 
                        u'Date of Progression': '2013,05,10', 
                        u'Off Study Date': u'', 
                        u'Last Known Survival Status': u'', 
                        u'Off Study Reason': u'', 
                        u'Best Response Confirm': u'', 
                        u'Off Treatment Reason': u'Disease progression, relapse during active treatment', 
                        u'Best Response': u'Progressive Disease', 
                        u'Followup Start Date': '2013,05,22'
                        } """
                        event = {}
                        key_found = True
                        try:
                            event['startDate'] = form[u'Followup Start Date']
                        except:
                            try:
                                event['startDate'] = form[u'Off Treatment Date']
                            except:
                                try:
                                    event['startDate'] = form[u'Expired Date']
                                except: 
                                    continue
                        try:
                            event['headline'] = form[u'Off Treatment Reason']
                        except:
                            event['headline'] = "Followup visit"
                        try:
                            date_off = str(form[u'Off Treatment Date']['$date'])
                        except:
                            date_off = ""
                        try:
                            date_prog = str(form[u'Date of Progression']['$date'])
                        except:
                            date_prog = ""
                        try:
                            best_resp = "<p>Best Response<b>" + str(form['Best Response'])+"</b>"
                        except:
                            best_resp = ""
                        event['text'] = "<p>Followup center: "+form[u'Followup Center']+"<p> Off Treatment Date "+date_off+"<p> Date of Progression:"+date_prog+best_resp
                        event['tag'] = "Diagnosis"
                        event['asset'] = {}
                        sample_list[sample]['timeline']['date'].append(event)
                        continue
                    if key =='Demographics':
                        event = {}
                        key_found = True
                        event['startDate'] = form['Consent Date']
                        event['headline'] = "Start of Study"
                        try:
                            age = str(form['Age'])
                        except:
                            age = "NA"
                        event['text'] = "<p>"+age+" yo "+form['Race']+" Male<p>"+"Study Site: "+form['Study Site']
                        event['tag'] = "History"
                        event['asset'] = {}
                        sample_list[sample]['timeline']['date'].append(event)
                        continue
                    if key =='ECOG-Weight V2' or key == 'ECOG-Weight V3' :
                        """{
                        u'Visit Date': ['2013,02,13', '2013,05,22'], 
                        u'Weight': [u'82.872', u'81.058'], 
                        u'Day': [u'1', u'1'], 
                        u'Phase': [u'Treatment', u'Treatment'], 
                        u'Segment': [u'Screening ', u'Progression/Study Termination'], 
                        u'Arm': [u'', u'Biopsy'], 
                        u'ECOG PS': [u'0 - Fully active', u'0 - Fully active']}
                        u'BMI': [30,30]}
                        """
                        key_found = True
                        if isinstance(form, list):
                            for index, f in enumerate(form):
                                event = {}
                                print("form" , key, "Weight member of list#:", index, f)
                                start_date = f['Visit Date']
                                event['startDate'] = start_date
                                event['headline'] = "ECOG Weight"
                                event['tag'] = "Diagnostic"
                                try:
                                    wt = str(f['Weight'])
                                except:
                                    wt = ""
                                try:
                                    ecog = f['ECOG-PS']
                                except:
                                    ecog = ""
                                event['text'] = "<p>Weight of patient: <b>"+wt+" kg </b><p> ECOG PS:"+ecog+"<p>Phase: <b>"+f['Phase']+"</b><br>Segment: <b>"+f['Segment']+"</b>"
                                sample_list[sample]['timeline']['date'].append(event)
                                continue
                        else:
                            event = {}
                            event['startDate'] = form['Visit Date']
                            event['headline'] = "ECOG Weight"
                            event['tag'] = "Diagnostic"
                            try:
                                #event['text'] = "<p>Weight of patient"+form['Weight'].strip()+" kg <p>" + "ECOG PS:"+form['ECOG PS']+" during phase:"+form['Phase']+" "+form['Segment']
                                event['text'] = "<p>Weight of patient: <b>"+form['Weight']+" kg </b><p> ECOG PS: <b>"+form['ECOG PS']+"</b><p>Phase: <b>"+form['Phase']+"</b><br>Segment: <b>"+form['Segment']+"</b>"
                            except TypeError: 
                                print("ERROR in Weight:", form)
                            except : 
                                print("ERROR in Weight:", form)
                            sample_list[sample]['timeline']['date'].append(event)
                            continue
                    if key =='RECIST V2':
                        event = {}
                        key_found = True
                        event['startDate'] = form['Visit Date']
                        event['headline'] = "ECOG Weight"
                        event['text'] = "Segment: "+form['Segment']+ "<br>Day: "+form['Day']+"<br>Arm: "+form['Arm']+"<br>Cycle (0 for baseline): "+form['Cycle (Enter 0 for Baseline)']+"<br>Lesion No. "+form['Lesion No.']+"<br>Lesion Type"+form['Lesion Type']+'<br>Nodal Site: '+form['Nodal Site']+"<br>Extranodal Site: "+form['Extranodal Site']+form['Method of Evalution']
                        continue
                    if key =='GU-Disease Assessment V3':
                        """ {
                        u'Visit Date': '2013,07,30', u'Comments': u'CT chest, abdomen, and pelvis', u'Day': u'1', u'Compared with previous scan': u'', u'Date of Procedure': '2013,07,22', u'Phase': u'Treatment', u'Are Lesions Present?': u'Yes', u'Segment': u'Screening ', u'Arm': u'', u'Procedure': u'CT Scan (non-spiral)', u'Date of Procedure_EXT': u''
                        }"""
                        key_found = True
                        if isinstance(form, list):
                            for index, f in enumerate(form):
                                event = {}
                                try:
                                    start_date = f['Visit Date']
                                except:
                                    continue
                                event['startDate'] = start_date
                                event['headline'] = "GU-Disease Assessment"
                                event['tag'] = "Diagnostic"
                                #event['text'] = "<p>Weight of patient:  "+form['Weight']+" kg <p>" + "ECOG PS:"+form['ECOG PS']+" <br>phase:"+form['Phase']+" <br>Segment: "+form['Segment']
                                try:
                                    comments = f[u'Comments']
                                    comment_str = "<p>Comments: <b>"+comments+"</b> "
                                except:
                                    comment_str = ""
                                    comments = ""
                                try:
                                    notes = "<p>Compared with previous scan: <b>" + f['Compared with previous scan']+"</b>"
                                except:
                                    notes = ""
                                try:
                                    event['text'] = "<p>Procedure: <b>"+f[u'Procedure']+"</b>"+comment_str+notes+"<p>Lesions Present?: <b>"+f['Are Lesions Present?']+"</b><p>Segment: <b>"+f['Segment']
                                except:
                                    event['text'] = ""
                                sample_list[sample]['timeline']['date'].append(event)
                        else:
                            event = {}
                            event['startDate'] = form['Visit Date']
                            event['headline'] = "GU-Disease Assessment"
                            event['tag'] = "Diagnostic"
                            comments = form[u'Comments']
                            if len(comments) > 2:
                                comment_str = "<p>Comments: <b>"+comments+"</b> "
                            else:
                                comment_str = ""
                            if len(form['Compared with previous scan'])>2:
                                notes = "<p>Compared with previous scan: <b>" + form['Compared with previous scan']+"</b>"
                            else:
                                notes = ""
                            event['text'] = "<p>Procedure: <b>"+form[u'Procedure']+"</b>"+comment_str+notes+"<p>Lesions Present?: <b>"+form['Are Lesions Present?']+"</b><p>Segment: <b>"+form['Segment']+"</b> Arm: <b>"+form['Arm']+"</b>"
                            sample_list[sample]['timeline']['date'].append(event)
                        continue
                    if key =='SU2C Biopsy V1' or key =='SU2C Biopsy V2' or key =='SU2C Biopsy V3':
                        """ {
                        u'Visit Date': '2013,02,22', 
                        u'If Other, specify': u'', 
                        u'List all anticancer meds taken within the 24 hours leading up to biopsy': u'', 
                        u'Site': u'Liver', 
                        u'Day': u'33', 
                        u'Date of Procedure': '2013,02,22', 
                        u'Phase': u'Treatment', 
                        u'Segment': u'Screening ', 
                        u'Arm': u'Biopsy', 
                        u'Date of Procedure_EXT': u''
                        } """
                        event = {}
                        biopsy_site = {}
                        key_found = True
                        if isinstance(form, list):
                            for index, f in enumerate(form):
                                event = {}
                                try:
                                    start_date = f['Date of Procedure']
                                except:
                                    continue
                                event['startDate'] = start_date
                                event['startDate'] = parse_date(start_date)
                                if firstBiopsy is None:
                                    firstBiopsy = event['startDate']
                                else:
                                    if event['startDate'] < firstBiopsy:
                                        firstBiopsy = event['startDate']
                                event['headline'] = "Biopsy"
                                event['tag'] = "Diagnostic"
                                try:
                                    other = ''.join(f[u'If other, specify'][index])
                                except:
                                    other = ""
                                    pass
                                try:
                                    drugs = "<p>Anticancer meds taken within the 24 hours leading up to biopsy: <b>".join(f[u'List all anticancer meds taken within the 24 hours leading up to biopsy'][index])
                                except:
                                    drugs = ""
                                    pass
                                try:
                                    site = f['Site'][index]
                                except:
                                    site = "NA"
                                event['text'] = "<p>Biopsy site: <b>"+site+"</b><p> "+other+ drugs + "</b><p>Segment: <b>"+f['Segment'][index]+"</b>"
                                biopsy_site['site'] = site
                                biopsy_site['id'] = sample
                                b_key = 'Biopsy'
                                if not sample_list.has_key(b_key):
                                    #print(biopsy_site)
                                    #print(str(biopsy_site))
                                    sample_list[b_key] = { 'sites': [] , 'counts' : {}}
                                sample_list[b_key]['sites'].append( biopsy_site )
                                try:
                                    print('b_key', b_key, sample_list[b_key]['counts'])
                                    if site not in sample_list[b_key]['counts']:
                                        sample_list[b_key]['counts'][site] = { 'count' : 1 }
                                    else:
                                        sample_list[b_key]['counts'][site]['count'] = sample_list[b_key]['counts'][site]['count'] + 1
                                except:
                                    print("##error in counts for key ", b_key, site)
                                continue
                        else:
                            if form['Date of Procedure'] <> '':
                                #event['startDate'] = form['Date of Procedure']
                                event['startDate'] = parse_date(form[u'Date of Procedure'])
                            else:
                                #event['startDate'] = form['Visit Date']
                                event['startDate'] = parse_date(form[u'Visit Date'])
                            if firstBiopsy is None:
                                firstBiopsy = event['startDate']
                            else:
                                if event['startDate'] < firstBiopsy:
                                    firstBiopsy = event['startDate']
                            event['headline'] = "Biopsy"
                            event['tag'] = "Diagnostic"
                            try:
                                other = ''.join(form[u'If Other, specify'])
                            except:
                                other = ""
                                pass
                            try:
                                drugs = "<p>Anticancer meds taken within the 24 hours leading up to biopsy: <b>".join(form[u'List all anticancer meds taken within the 24 hours leading up to biopsy'])
                            except:
                                drugs = ""
                                pass
                            event['text'] = "<p>Biopsy site: <b>"+form['Site']+"</b><p> "+other+ drugs + "</b><p>Segment: <b>"+form['Segment']+"</b>"
                        sample_list[sample]['timeline']['date'].append(event)
                    if key =='Prostate Diagnosis V1' or key =='Prostate Diagnosis V2' or key =='Prostate Diagnosis V4':
                        key_found = True
                        if isinstance(form['Visit Date'], list):
                            for index, start_date in enumerate(form['Visit Date']):
                                event = {}
                                if len(form[u'Date of diagnosis'][index]) > 3:
                                    event['startDate'] = parse_date(form[u'Date of diagnosis'][index])
                                else:
                                    event['startDate'] = parse_date(form[u'Visit Date'][index])
                                event['tag'] = "Diagnostic"
                                event['headline'] = "Prostate Diagnosis"
                                event['text'] = "<p>Disease state at diagnosis: <b>"+form['Disease state at diagnosis'][index]+"</b><p>Phase:<b>"+form[u'Phase'][index]+"</b><p>" + "Primary Gleason Score: <b>"+str(form['Primary Gleason Score'][index])+"</b>Secondary Gleason Score: <b>"+str(form['Secondary Gleason Score'][index])+"</b> Total Gleason Score: <b>"+str(form['Total Gleason Score'][index])+"</b><p>"+"Segment: <b>"+form['Segment'][index] + "</b>"
                                sample_list[sample]['timeline']['date'].append(event)
                                event = {}
                                event['startDate'] = parse_date(form['PSA Date'][index])
                                event['headline'] = "PSA: "+str(form['PSA Value'][index])
                                event['tag'] = "Diagnostic"
                                event['text'] = "PSA: "+str(form['PSA Value'][index])
                                sample_list[sample]['timeline']['date'].append(event)
                                continue
                        else:
                            event = {}
                            if form.has_key(u'Date of diagnosis'):
                                if isinstance(form[u'Date of diagnosis'], datetime):
                                    event['startDate'] = parse_date(form[u'Date of diagnosis'])
                                else:
                                    event['startDate'] = parse_date(form[u'Visit Date'])
                            else:
                                print('#form',form)
                                event['startDate'] = parse_date(form[u'Visit Date'])
                            event['headline'] = "Prostate Diagnosis"
                            event['tag'] = "Diagnostic"
                            #event['text'] = "<p>" + "Primary/Secondary Gleason Score: <b>"+str(form['Primary Gleason Score'])+"/"+str(form['Secondary Gleason Score'])+"</b> Total Gleason Score: <b>"+str(form['Total Gleason Score'])+"</b><p>Phase: <b>"+str(form[u'Phase'])+"</b><p>"+"Segment: <b>"+form['Segment'] + "</b>"
                            sample_list[sample]['timeline']['date'].append(event)
                            event = {}
                            try:
                                event['startDate'] = parse_date(form['PSA Date'])
                                event['headline'] = "PSA: "+str(form['PSA Value'])
                                event['tag'] = "Diagnostic"
                                event['text'] = "PSA: <b>"+str(form['PSA Value'])+"</b>"
                                sample_list[sample]['timeline']['date'].append(event)
                            except:
                                pass
                            continue
                    if key =='SU2C Prior TX V1' or key =='SU2C Prior TX V2' or key =='SU2C Prior TX V3':
                        """{
                        u'Best Response': [u'Partial Response', u'Stable Disease', u'Progressive Disease', u'Not Evaluable', u'Partial Response', u'Progressive Disease', u'Partial Response', u'Complete Response'], 
                        u'Drug Name': [u'Abiraterone', u'Carboplatin/Etoposide', u'Enzalutamide', u'Taxotere', u'Casodex', u'Ketoconazole', u'Lupron', u''],
                        u'If Progressive Disease, Specify Type': [u'PSA', u'PSA', u'PSA', u'', u'PSA', u'PSA', u'PSA', u''], 
                        u'Visit Date': ['2013,07,17', '2013,07,17', '2013,07,17', '2013,07,17', '2013,07,17', '2013,07,17', '2013,07,17', '2013,07,17'], 
                        u'Start Date_EXT': [u'', u'', u'', u'', u'', u'', u'', u''], 
                        u'Reason for Stopping Treatment Details': [u'Biochemical and radiographic progression', u'Biochemical progression', u'Biochemical and radiographic progression', u'Pt did not tolerate treatment', u'', u'Biochemical progression; restarted Lupron', u'Biochemical and radiographic progression', u''], 
                        u'Stop Date_EXT': [u'', u'', u'', u'', u'', u'', u'', u''], 
                        u'Reason for Stopping Treatment': [u'Progressive Disease', u'Progressive Disease', u'Progressive Disease', u'Patient Choice', u'Progressive Disease', u'Progressive Disease', u'Progressive Disease', u'Completed Treatment'], 
                        u'Day': [u'1', u'1', u'1', u'1', u'1', u'1', u'1', u'1'], 
                        u'Treatment Type': [u'Hormonal', u'Chemotherapy (NOS)', u'Hormonal', u'Chemotherapy (NOS)', u'Hormonal', u'Hormonal', u'Hormonal', u'Radiation (NOS)'], 
                        u'If other, specify': [u'', u'', u'', u'', u'', u'', u'', u''], 
                        u'Stop Date': ['2012,10,10', '2011,06,01', '2013,04,10', '2013,07,10', '2010,05,01', '2010,07,01', '2013,07,10', '2005,08,01'], 
                        u'Phase': [u'Treatment', u'Treatment', u'Treatment', u'Treatment', u'Treatment', u'Treatment', u'Treatment', u'Treatment'], 
                        u'Start Date': ['2011,06,01', '2011,02,01', '2012,10,10', '2013,04,10', '2009,06,01', '2010,05,01', '2005,04,01', '2005,04,01'], 
                        u'Treatment Details': [u'With Lupron', u'Combination treatment while on Lupron', u'With Lupron', u'', u'With Lupron', u'With hydrocortisone', u'Intermittent', u''], 
                        u'Segment': [u'Screening ', u'Screening ', u'Screening ', u'Screening ', u'Screening ', u'Screening ', u'Screening ', u'Screening '], 
                        u'Arm': [u'', u'', u'', u'', u'', u'', u'', u'']
                                }"""
                        key_found = True
                        if isinstance(form, list):
                            for index, f in enumerate(form):
                                event = {}
                                start_date = f['Visit Date']
                                #start_date_ext = f['Start Date Ext']
                                try:
                                    if isinstance(f['Start Date'], datetime):
                                        start_date, start_date_dt = parse_date_both(f['Start Date'], f['Start Date Ext'])
                                        stop_date_dt = start_date_dt
                                except:
                                    continue
                                #stop_date_ext = f['Stop Date Ext']
                                stop_date = start_date
                                weeks_diff = "Unknown"
                                weeks_num = 0
                                try:
                                    if isinstance(f['Stop Date'], datetime):
                                        try:
                                            stop_date, stop_date_dt = parse_date_both(f['Stop Date'], f['Stop Date Ext'])
                                            weeks_num = weeks_between(start_date_dt, stop_date_dt)
                                            print("weeks num "+str(weeks_num))
                                        except:
                                            pass
                                except:
                                    pass
                                if weeks_num > 900:
                                    weeks_diff = "Unknown"
                                else:
                                    weeks_diff = str(weeks_num)+" weeks"
                                    if weeks_diff == 1:
                                        weeks_diff = str(weeks_num)+" week"
                                event['startDate'] = start_date
                                if len(stop_date) > 3:
                                    event['stopDate'] = stop_date
                                event['tag'] = "Treatment"
                                try:
                                    event['headline'] = "Prior Treatment: "+str(f['Drug Name'])
                                except:
                                    try:
                                        event['headline'] = "Prior Treatment: "+str(f['Treatment Details'])
                                    except:
                                        try:
                                            event['headline'] = "Prior Treatment: "+str(f['Treatment Type'])
                                        except: 
                                            pass
                                try:
                                    details = "<br>Details<b>" + str(f['Treatment Details'])+"</b>"
                                except KeyError:
                                    details = ""
                                except:
                                    details = ""
                                try:
                                    best_resp = "<br>PSA Response<b>" + str(f['PSA Response'])+"</b>"
                                except KeyError:
                                    best_resp = ""
                                try:
                                    reason = "<br>Reason for Stopping Treatment<b>" + str(f['Reason for Stopping Treatment'])+"</b>"
                                except:
                                    reason = ""
                                event['text'] = "<p>"+details+best_resp+reason+ "</b><p>On treatment for <b>"+weeks_diff+ "</b>"
                                sample_list[sample]['timeline']['date'].append(event)
                                continue
                        else:
                            event = {}
                            start_date_ext = form['Start Date Ext']
                            if len(form['Start Date']) > 5:
                                start_date = str(form['Start Date']['date'])
                            stop_date_ext = form['Stop Date Ext']
                            if len(form['Stop Date']) > 5:
                                stop_date = str(form['Stop Date']['date'])
                            event['startDate'] = start_date
                            event['stopDate'] = stop_date
                            event['tag'] = "Treatment"
                            if form['Drug Name'] <> '':
                                event['headline'] = "Prior Treatment: "+str(form['Drug Name'])
                            else:
                                print('index',index,'form', form)
                                try:
                                    if len(form['Treatment Details'][index]) < 20:
                                        event['headline'] = "Prior Treatment: "+str(form['Treatment Details'][index])
                                    else:
                                        event['headline'] = "Prior Treatment: "+str(form['Treatment Type'][index])
                                except: 
                                    event['headline'] = "Prior Treatment: "+str(form['Treatment Type'])
                            event['text'] = "<p>Type: <b>" + str(form['Treatment Type'])+ "</b><br>Treatment details: <b>"+str(form['Treatment Details'])+"</b><br>Best Response: <b>"+form['Best Response']+"</b><br>Reason for Stopping Treatment: <b>"+form['Reason for Stopping Treatment']+"</b>"
                            sample_list[sample]['timeline']['date'].append(event)
                            continue
                    if key =='SU2C Subsequent Treatment V1' :
                        """{
                        u'Best Response': u'Progressive Disease', 
                        u'Drug Name': u'Abiraterone; Prednisone', 
                        u'If Progressive Disease, Specify Type': u'Soft Tissue', 
                        u'Visit Date': '2013,02,22', 
                        u'Start Date_EXT': u'', 
                        u'Reason for Stopping Treatment Details': u'', 
                        u'Stop Date_EXT': u'', 
                        u'Reason for Stopping Treatment': u'Progressive Disease', 
                        u'Day': u'33', 
                        u'Treatment Type': u'Hormonal', 
                        u'If other, specify': u'', 
                        u'Stop Date': '2013,05,10', 
                        u'Phase': u'Treatment', 
                        u'Start Date': '2013,03,25', 
                        u'Treatment Details': u'', 
                        u'Segment': u'Screening ', 
                        u'Arm': u'Biopsy' 
                        }"""
                        event = {}
                        key_found = True
                        print("key", key )
                        if isinstance(form, list):
                            for index, f in enumerate(form):
                                print("form", f )
                                event = {}
                                try:
                                    start_date = str(f['Start Date'])
                                except:
                                    start_date = str(f['Visit Date'])
                                try:
                                    stop_date = str(f['Stop Date'])
                                    event['stopDate'] = stop_date
                                except:
                                    pass
                                event['startDate'] = start_date
                                event['tag'] = "Treatment"
                                try:
                                    details = "<br>Details<b>" + str(f['Treatment Details'])+"</b>"
                                except:
                                    details = ""
                                try:
                                    event['headline'] = "On Study Treatment: "+str(f['Drug Name'])
                                except:
                                    event['headline'] = details
                                try:
                                    best_resp = "<br>Best Response<b>" + str(f['Best Response'])+"</b>"
                                except:
                                    best_resp = ""
                                try:
                                    reason = "<br>Resason for Stopping Treatment<b>" + str(f['Resason for Stopping Treatment'])+"</b>"
                                except:
                                    reason = ""
                                if key =='SU2C Subsequent TX V1':
                                    event['text'] = "<p>Type: " + str(f['Treatment Type'])+ details+best_resp+reason
                                if key =='SU2C Subsequent TX V2':
                                    event['text'] = details+best_resp+reason
                                sample_list[sample]['timeline']['date'].append(event)
                                #continue
                        else:
                            if len(form['Start Date']) > 5:
                                start_date = str(form['Start Date']['date'])
                            else:
                                start_date = str(form['Visit Date']['date'])
                            if len(form['Stop Date']) > 5:
                                try:
                                    stop_date = str(form['Stop Date']['date'])
                                except:
                                    stop_date = form['Stop Date Ext']
                            event['headline'] = "On Study Treatment: "+str(form['Drug Name'])
                            event['startDate'] = start_date
                            event['startDateExt'] = form['Start Date Ext']
                            if len(stop_date)> 2:
                                event['stopDate'] = stop_date
                                event['stopDateExt'] = form['stop Date Ext']
                            event['tag'] = "Treatment"
                            if key =='SU2C Subsequent TX V1':
                                event['text'] = "<p>Type: " + str(form['Treatment Type'])+ "<br>Details: "+str(form['Treatment Details'])+"<br>Best Response : "+str(form['Best Response'])+"<br>Reason for Stopping Treatment: "+form['Reason for Stopping Treatment']
                            if key =='SU2C Subsequent TX V2' or key == 'SU2C Subsequent Treatment V1':
                                event['text'] = "<p>Type: <b>" + str(form['Treatment Type'])+ "</b><br>Details: <b>"+str(form['Treatment Details'])+"</b><br>Best Response: <b>"+str(form['Best Response'])+"</b><br>Reason for Stopping Treatment: <b>"+form['Reason for Stopping Treatment']+"</b>"
                            sample_list[sample]['timeline']['date'].append(event)
                        continue
                    if not key_found:
                        print ("#key "+key+" not found. ")
                        traceback.print_exc(file=sys.stderr)
                print(">>sample end:",sample)
                filename = options.directory+"/"+sample+".json"
                f = open(filename, 'w')
                print ('>> Writing '+sample+' attributes json to '+filename+'.')
                #print ("%s" % ({"patient":sample,"attributes":sample_list[sample]['attributes']}))
                j=json.dumps({"patient":sample,"attributes":sample_list[sample]['attributes']}, default=json_util.default, sort_keys=True)
                f.write("%s\n" % (j))
                oncore_out.write("%s\n" % (j))
                f.close()
                filename = options.directory+"/"+sample+"_timeline.json"
                f = open(filename, 'w')
                print ('>> Writing '+sample+' timeline json to '+filename+'.')
                #print ("%s" % ({"timeline":sample_list[sample]['timeline']}))
                j = json.dumps({"timeline":sample_list[sample]['timeline']}, default=json_util.default, sort_keys=True)
                f.write("%s" % j)
                f.close()
                page_no = 1
                all.write("<tr><td><a href='%s.html#%d'>%s</a></td></tr>\n" 
                        %(sample, page_no, sample))
                out_html_file = options.directory+"/"+sample+".html"
                shutil.copy2(os.path.join(tool_root, "oncore2jsonTemplate.html"), out_html_file)
                #subprocess.call(["cp", "oncore2jsonTemplate.html", out_html_file]) 
                f = open(out_html_file, 'a+')
                f.write("\t\tsource:	'"+sample+".json' \n")
		f.write("\t}\n")
                f.write("\t</script>\n")
                f.write("\t<script type=\"text/javascript\" src=\"/static/timeline/js/storyjs-embed.js\"></script>\n")
                f.write("<!-- END Timeline Embed-->\n")
                f.write("</body>\n")
                f.write("</html>\n")
                f.close()
            all.write("</table>\n")
            all.write("</body>\n")
            all.write("</html>\n")
            all.close()
            cbio = open("data_clinical_events.txt", 'a+')
            print("##cbio len=", len(sample_list.items()), "\n")
            for key,values in sample_list.items():
                    print("#key:"+key)
                    sample_dict = sample_list[key]
                    print("#timeline ")
                    if 'timeline' in sample_dict:
                        for h in sample_dict['timeline']['date']:
                            try:
                                event_type = h['tag']
                            except: 
                                event_type = 'missing'
                            print('#event_type',event_type, h)
                            if event_type == 'Treatment' :
                                print('#treatment',h)
                                try:
                                    agent = h['headline']
                                except: 
                                    agent = "Unknown"
                                treat_start_dt = None
                                treat_stop_dt = None
                                try:
                                    print(key+" agent:"+agent)
                                    print('#timeline start', h['startDate'], h['startDateExt'])
                                    treat_start_str, treat_start_dt = parse_date_both(h['startDate'], h['startDateExt'])
                                except:
                                    try:
                                        treat_start_str, treat_start_dt = parse_date_both(h['startDate'],"")
                                    except:
                                        print('error converting start date',h['startDate'])
                                try:
                                    print(h['stopdate']['date'])
                                    treat_stop_str, treat_stop_dt = parse_date_both(h['stopDate'], h['stopDateExt'])
                                except:
                                    print(key+" failed to get stop date for "+agent+"using start date")
                                    treat_stop_dt = None
                                    pass
            cbio.close()
            cohort.write("%s" % (json.dumps(sample_list, default=json_util.default, sort_keys=True)))
            cohort.close()
            oncore_out.close()


        return None

    av = sys.argv[1:]
    if not av:
        main(av)
    firstarg = av[0].lower()
    if firstarg == "hotshot":
        import hotshot, hotshot.stats
        av = av[1:]
        prof_log_name = "XXXX.prof"
        prof = hotshot.Profile(prof_log_name)
        # benchtime, result = prof.runcall(main, *av)
        result = prof.runcall(main, *(av, ))
        print("result", repr(result))
        prof.close()
        stats = hotshot.stats.load(prof_log_name)
        stats.strip_dirs()
        stats.sort_stats('time', 'calls')
        stats.print_stats(20)
    elif firstarg == "profile":
        import cProfile
        av = av[1:]
        cProfile.run('main(av)', 'YYYY.prof')
        import pstats
        p = pstats.Stats('YYYY.prof')
        p.strip_dirs().sort_stats('cumulative').print_stats(30)
    elif firstarg == "psyco":
        PSYCO = 1
        main(av[1:])
    else:
        main(av)
