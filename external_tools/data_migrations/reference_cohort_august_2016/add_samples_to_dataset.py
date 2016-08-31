#! /usr/bin/env python

"""
# given a dataset json,
manually add the sample_labels, sample_label_index , feature_labels

Usage:
export dataset json from mongo
./add_samples_to_dataset.py > dataset_with_samples.json
import new dataset json to mongo

Requires the following files to exist in the pwd:
    -- dataset.json : dump of the existing dataset without sample labels, etc
    -- samples : list of sample IDs with study lables prepended
    -- features : list of feature names
"""

import json
import sys

# Are all elements of x unique
def uniq(x):
    seen = set()
    return not any(i in seen or seen.add(i) for i in x)


def main():

    with open("dataset.json") as dataset:
        data = json.load(dataset)

    with open("samples") as samplines:
        samples = [s.rstrip() for s in samplines.readlines()]
    with open("features") as featurelines:
        features = [f.rstrip() for f in featurelines.readlines()]

    # Require unique lists
    if((not uniq(samples)) or (not uniq(features))):
        print "Samples not unique!"   
        sys.exit(1)
 

    # study qualifer needs to already be present
    data["sample_labels"] = samples 

    # sample label index
    sample_label_index = {}
    for idx, sample in enumerate(samples):
        sample_label_index[sample] = idx

    data["sample_label_index"] = sample_label_index
    data["feature_labels"] = features

    print (json.dumps(data))
    sys.exit(0)


if __name__ == "__main__":
    main()
