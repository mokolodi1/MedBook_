#! /usr/bin/env python
"""Usage:
  ./uniquify_rectangular_columns.py input.tsv > output.tsv


  Input must be :
   A rectangular file with decimal entries
Given a rectangular file, with the first row as the keys for the columns,
produces a rectangular file where any duplicate keys have their values averaged in each row.

These keys will be moved after all non-duplicate keys, retaining their relative order.
For example, if all A keys are unique and B keys are duplicate:
A1 A2 B3 A4 B5 B6 A7 A8 will be reordered to:
A1 A2 A4 A7 A8 B3 B5 B6

Takes the file as an argument and prints to stdout.

see NUM_DECIMAL_PLACES below to set how many digits are printed out.

requires python 2.7 for orderedDict
"""

import sys
from collections import OrderedDict
from decimal import *


def main():
  """
    foo?
  """

  NUM_DECIMAL_PLACES = Decimal(10)** -4

  if len(sys.argv) != 2:
    print __doc__
    sys.exit(1)

  with open(sys.argv[1]) as lines:

    key_counts = {} # How many times each key appears eg {"sample2" : 3}
    header = lines.readline().rstrip().split("\t")
    found_a_duplicate = False

    # populate key_counts
    for item in header:
      if(item in key_counts ):
        key_counts[item] += 1
        found_a_duplicate = True
      else:
        key_counts[item] = 1

    sys.stderr.write(str(key_counts) + "\n")

    if(not found_a_duplicate):
      sys.stderr.write("No duplicate columns!\n")
      sys.exit(0)

    # Reorder the header -- all keys appearing once first,
    # & then all keys appearing multiple times. Relative
    # order within those two remains the same
    uniq_keys = []
    dupe_keys = []
    seen_keys = set()
    for key in header:
      if(key_counts[key] > 1):
        if(not (key in seen_keys)):
          dupe_keys.append(key)
          seen_keys.add(key)
      else:
        uniq_keys.append(key)
  
    result = uniq_keys + dupe_keys
    print("\t".join(result))

    # Then, iterate over the values and print the lines
    # Keep single values the same, & average duplicate values together
    
    for line in lines:
      result = []
      # Store the values in order so they will match the order of the keys above
      values_to_average = OrderedDict()

      items = line.rstrip().split("\t")
      for idx, value in enumerate(items):
        key = header[idx]
        # If there's only one item with this key, just push it
        if(key_counts[key] == 1):
          result.append(value)
        else:
          # otherwise, add it to the values_to_average by key so we find it later
          if(not (key in values_to_average)):
            values_to_average[key] = Decimal(value)
          else:
            values_to_average[key] += Decimal(value)

      # At the end, average all the values and append.
      for key, sum_total in values_to_average.items():
        averaged = (sum_total / Decimal(key_counts[key])).quantize(NUM_DECIMAL_PLACES)
        result.append(averaged)

      print("\t".join(map(lambda x:str(x),result)))

  sys.stderr.write("Done!\n")
  sys.exit(0)

if __name__ == "__main__":
  main()
  
