// Template.editSampleGroup

Template.editSampleGroup.onCreated(function () {
  let instance = this;

  instance.sampleGroup = instance.data.sampleGroup;

  // make sure it's initialized
  if (!instance.sampleGroup.get()) {
    instance.sampleGroup.set({
      name: "",
      version: 1,
      collaborations: [ Meteor.user().collaborations.personal ],

      // ex: {
      //   collection_name: "SampleGroups",
      //   mongo_id: "MONGO_ID",
      //   filters: [
      //     { ... }
      //   ]
      // }
      filtered_sample_sources: [],
    });
  }

  // subscribe to the names/versions of all data sets and sample groups
  instance.dataSetsSub = instance.subscribe("allOfCollectionOnlyMetadata",
      "DataSets");
  instance.sampleGroupsSub = instance.subscribe("allOfCollectionOnlyMetadata",
      "SampleGroups");

  // subscribe to the added data sets / sample groups (names and sample_labels)
  instance.autorun(() => {
    let entries = instance.data.sampleGroup.get().filtered_sample_sources;

    let sgEntries = _.where(entries, { collection_name: "SampleGroups" });
    let dsEntries = _.where(entries, { collection_name: "DataSets" });
    let sgIds = _.pluck(sgEntries, "mongo_id");
    let dsIds = _.pluck(dsEntries, "mongo_id");

    if (dsIds.length || sgIds.length) {
      instance.subscribe("sgCreatorInfo", dsIds, sgIds);
    }
  });

  // store this seperately so that we don't look for a version every time
  // something that's not the name changes
  instance.name = new ReactiveVar("");

  // look up the name in the sample groups this person has access to
  // and figure out what version this one should be
  let updateVersion = _.debounce((name) => {
    Meteor.call("getSampleGroupVersion", name, (error, result) => {
      let sampleGroup = instance.sampleGroup.get();
      sampleGroup.version = result;
      instance.sampleGroup.set(sampleGroup);
    });
  }, 250);
  instance.autorun(() => {
    updateVersion(instance.name.get());
  });

  // update the sample group with the name
  instance.autorun(() => {
    // don't rerun when sample group changes
    let sampleGroup = Tracker.nonreactive(() => {
      return instance.sampleGroup.get();
    });
    sampleGroup.name = instance.name.get();
    instance.sampleGroup.set(sampleGroup);
  });
});

Template.editSampleGroup.onRendered(function () {
  let instance = this;

  instance.$(".sample-group-version").popup({
    position : "bottom right",
    content: "Sample group version",
  });

  // set up the dropdown and the onChange event to add the sources
  instance.$(".add-set-or-group").dropdown({
    onChange(mongo_id, text, $selected) {
      // onChange is also fired when the dropdown is cleared, so $selected
      // isn't necessarily set
      if ($selected) {
        let sampleGroup = instance.sampleGroup.get();

        sampleGroup.filtered_sample_sources.push({
          collection_name: $selected[0].dataset.collection,
          mongo_id,
          filters: [],
        });

        instance.sampleGroup.set(sampleGroup);

        Meteor.defer(() => {
          // I can't figure out how to get the placeholder text to come back:
          // .dropdown("restore defaults") doesn't work :(
          $(".add-set-or-group").dropdown("clear");
        });
      }
    }
  });
});

function getAddedIds(instance, collection_name) {
  let sampleGroup = instance.sampleGroup.get();
  let addedDataSets = _.where(sampleGroup.filtered_sample_sources, {
    collection_name: "DataSets"
  });

  return _.pluck(addedDataSets, "mongo_id");
}

Template.editSampleGroup.helpers({
  notAddedDataSets() {
    let alreadyAdded = getAddedIds(Template.instance(), "DataSets");



    return DataSets.find({
      _id: {
        $nin: alreadyAdded
      }
    }, {
      sort: { name: 1 }
    });
  },
  notAddedSampleGroups() {
    return SampleGroups.find({
      _id: {
        $nin: getAddedIds(Template.instance(), "SampleGroups")
      }
    }, {
      sort: { name: 1 }
    });
  },
  sampleGroup: function () {
    return Template.instance().sampleGroup; // returns ReactiveVar
  },
  getSampleGroup: function () {
    return Template.instance().sampleGroup.get();
  },
  sourceName() {
    let collection = MedBook.collections[this.collection_name];
    let source = collection.findOne(this.mongo_id);

    if (source) {
      if (this.collection_name === "SampleGroups") {
        return `${source.name} (v${source.version})`;
      } else {
        return source.name;
      }
    } else {
      // NOTE: this could also mean they don't have access,
      // but that would be rare.
      // (Someone would have to delete/remove access to the
      // source while they were working on the new sample group.)
      return "Loading...";
    }
  },
  metadataSubsReady() {
    let instance = Template.instance();

    return instance.dataSetsSub.ready() && instance.sampleGroupsSub.ready();
  },
});

Template.editSampleGroup.events({
  "keyup .sample-group-name": function (event, instance) {
    instance.name.set(event.target.value);
  },
});

// Template.addRemoveFilterButtons

Template.addRemoveFilterButtons.onCreated(function () {
  let instance = this;

  instance.addFilter = function(filterObject) {
    // add the filter to the data set
    let sampleGroup = instance.data.sampleGroup.get();

    let source = sampleGroup.filtered_sample_sources[instance.data.sourceIndex];
    source.filters.push(filterObject);

    instance.data.sampleGroup.set(sampleGroup);
  };
});

// Only allow one form values filter

Template.addRemoveFilterButtons.onRendered(function () {
  let instance = this;

  instance.$(".add-filter").dropdown({
    action: "hide"
  });
});

Template.addRemoveFilterButtons.events({
  "click .add-form-values-filter": function (event, instance) {
    instance.addFilter({
      type: "form_values",
      options : {
        form_id: "",
        mongo_query: "",
      },
    });
  },
  "click .add-sample-label-list-filter": function (event, instance) {
    instance.addFilter({
      type: "include_sample_list",
      options: {
        sample_labels: []
      },
    });
  },
  "click .add-exclude-sample-label-list-filter": function (event, instance) {
    instance.addFilter({
      type: "exclude_sample_list",
      options: {
        sample_labels: []
      },
    });
  },
  "click .remove-data-set": function (event, instance) {
    let sampleGroup = instance.data.sampleGroup.get();

    sampleGroup.filtered_sample_sources.splice(instance.data.sourceIndex, 1);

    instance.data.sampleGroup.set(sampleGroup);
  },
});



// Template.showFilter

Template.showFilter.onCreated(function () {
  let instance = this;

  instance.sampleGroup = instance.data.sampleGroup;

  instance.setOptions = function (newOptions) {
    let sampleGroup = instance.sampleGroup.get();

    let { filterIndex, sourceIndex } = instance.data;
    sampleGroup.filtered_sample_sources[sourceIndex].filters[filterIndex].options = newOptions;

    instance.sampleGroup.set(sampleGroup);
  };
});

Template.showFilter.helpers({
  getFilter: function () {
    let { sampleGroup, data } = Template.instance();

    let dataSet = sampleGroup.get().filtered_sample_sources[data.sourceIndex];

    if (dataSet) {
      return dataSet.filters[data.filterIndex];
    }
  },
  setOptions: function () {
    return Template.instance().setOptions;
  },
  source() {
    let instance = Template.instance();
    return instance.sampleGroup.get()
        .filtered_sample_sources[instance.data.sourceIndex];
  },
});

Template.showFilter.events({
  "click .remove-filter": function (event, instance) {
    // define a button with this class in a sub-template to make it work
    let sampleGroup = instance.sampleGroup.get();

    let { filterIndex, sourceIndex } = instance.data;
    let source = sampleGroup.filtered_sample_sources[sourceIndex];
    source.filters.splice(filterIndex, 1);

    instance.sampleGroup.set(sampleGroup);
  },

  // NOTE: these buttons are defined in sub-templates
  "click .show-done-editing"(event, instance) {
    // shake the done button to show where it is ;)
    instance.$(".done-editing").transition("tada");
  },
});



// Template.sampleLabelListFilter

Template.sampleLabelListFilter.onCreated(function () {
  let instance = this;

  instance.editing = new ReactiveVar(true);

  // for showing errors
  instance.invalidSampleLabels = new ReactiveVar(null);
  instance.filterError = new ReactiveVar(null);
});

Template.sampleLabelListFilter.helpers({
  sampleLabelsToText: function () {
    let sampleObjs =
        MedBook.utility.sampleArrStrToObj(this.options.sample_labels);

    return _.pluck(sampleObjs, "uq_sample_label").join("\n");
  },
  getInvalidSampleLabels: function () {
    return Template.instance().invalidSampleLabels.get();
  },
  getEditing: function () {
    return Template.instance().editing.get();
  },
  filterError() {
    return Template.instance().filterError;
  },
});

Template.sampleLabelListFilter.events({
  "click .done-editing": function (event, instance) {
    event.preventDefault();

    // clear errors
    instance.invalidSampleLabels.set(null);
    instance.filterError.set(null);

    let collection = MedBook.collections[instance.data.source.collection_name];
    let source = collection.findOne(instance.data.source.mongo_id);

    // split by whitespace characters, get rid of spaces
    let textareaSampleLabels = instance.$("textarea").val().split(/[\s,;]+/);
    let sample_labels = _.chain(textareaSampleLabels)
      .filter((value) => { return value; }) // remove falsey
      .uniq()                               // unique values only
      .value();

    if (sample_labels.length === 0) {
      instance.filterError.set({
        header: "No samples",
        message: "Please enter at least one sample or remove this fitler.",
      });
      return;
    }

    // if they're unqualified sample labels deal with that...
    if (sample_labels[0].indexOf("/") === -1) {
      // given that they're unqualified all the samples in the source
      // have to be from the same study
      let sampleStudyObjs =
          MedBook.utility.sampleArrStrToObj(source.sample_labels);
      let uniqueStudyLabels = _.uniq(_.pluck(sampleStudyObjs, "study_label"));

      if (uniqueStudyLabels.length !== 1) {
        instance.filterError.set({
          header: "Study labels missing",
          message: "Given that there are multiple studies in the data set " +
          "or sample group, study labels must be included in the list.",
        });
        instance.editing.set(false);
        return;
      }

      // given there's only one study, prepend that to every sample label
      sample_labels = _.map(sample_labels, (label) => {
        return `${uniqueStudyLabels[0]}/${label}`;
      });
    }

    // make sure we don't have any bad values
    let sourceLabelIndex = _.reduce(source.sample_labels, (memo, label) => {
      memo[label] = true;
      return memo;
    }, {});
    let badValues = _.filter(sample_labels, function (sample_label) {
      return !sourceLabelIndex[sample_label];
    });

    // if we do, display them to the user
    if (badValues.length) {
      let sampleObjs = MedBook.utility.sampleArrStrToObj(badValues);

      instance.invalidSampleLabels.set(_.pluck(sampleObjs, "uq_sample_label"));
      return;
    }

    // nicely done! set the options and return to non-editing
    instance.data.setOptions({
      sample_labels
    });
    instance.editing.set(false);
  },
  "click .edit-filter": function (event, instance) {
    // unclear why we need this, but otherwise it submits the form
    event.preventDefault();

    instance.editing.set(true);
  },
  "click .close-sample-error-message": function (event, instance) {
    instance.invalidSampleLabels.set(null);
  },
});

Template.formValuesFilter.onCreated(function(){
  // Find forms that share samples with this data set
  // let them be options for which form to filter on
  let instance = this;

  instance.editing = new ReactiveVar(true);

  let { collection_name, mongo_id } = instance.data.source;
  instance.available_filter_forms = new ReactiveVar();
  instance.available_filter_forms.set([{name: "Loading forms...", formId: "placeholder_loadingforms"}]);

  instance.querybuilderSelector = new ReactiveVar("");
  instance.active_crf = new ReactiveVar("");

  // Store forms for this data set in a reactive var for later use.
  Meteor.call("getFormsMatchingDataSet", collection_name, mongo_id,
      function(err, res){
    if(err) {
      instance.available_filter_forms.set([{name:'Error loading forms!', formId: 'Errorloadingforms'}]);
      console.log("Error getting forms for this data set", err);
      throw err;
    } else {
      instance.available_filter_forms.set(res);
    }
  });
});


Template.formValuesFilterMenu.onRendered(function(){
  let instance = this;
  instance.$(".ui.dropdown").dropdown();
});

Template.formValuesFilter.helpers({
  getAvailableFilterForms: function() {
    return Template.instance().available_filter_forms.get();
  },
  getEditing: function(){
    return Template.instance().editing.get();
  },
});

Template.formValuesFilter.events({
  "click .chosen-form-filter": function(event, instance) {
    // Find the ids for the selected form from the dropdown
    let clicked_form_id = event.target.dataset.form_id ;

    // Find the form that matches the current dataset and form id
    let forms = instance.available_filter_forms.get();
    let chosenForm = _.find(forms, function(form){
      return form.formId === clicked_form_id;
    });
    let formFields = chosenForm.fields ;

    // Then build the filters for the querybuilder
    let queryFilters = [];
    for(let field of formFields){
      // field will be object with keys
      // name, value_type, values
      queryFilters.push(
        { id: field.name,
          label: field.name,
          type: "string", // TODO use value_type & propagate this through
          input: "select",
          values: field.values,
          operators: ['equal', 'not_equal', 'is_null', 'is_not_null'],
        }
      );
    }

    // If there's already an active querybuilder for this dataset, hide it
    if(instance.querybuilderSelector.get() !== ""){
      instance.$(instance.querybuilderSelector.get()).hide();
      instance.active_crf.set("");
    }

    // Find the empty querybuilder div we prepared in the formValuesFilter template
    // and attach a querybuilder object to it
    let selector = `.${clicked_form_id}_querybuilder`;
    instance.$(selector).show();
    instance.$(selector).queryBuilder({
      filters: queryFilters,
      });

    // And set it as active so we can find it later
    instance.querybuilderSelector.set(selector);
    instance.active_crf.set(clicked_form_id);
  },

  "click .done-editing": function(event, instance){
    event.preventDefault();

    let selector = instance.querybuilderSelector.get();

    let query = instance.$(selector).queryBuilder('getMongo');
    let serialized_query = JSON.stringify(query);
    let sampleCrfId = decodeURIComponent(instance.active_crf.get());
     let dataset_id = instance.data.data_set_id;

    instance.editing.set(false);

    // Populate the filter info
    // TODO: rename variables -- sampleCrfId no longer refers to a CRF
    // but to a Form; & it's the ID of the actual Form (not a Record
    // of that form)
    instance.data.setOptions({
      form_id: sampleCrfId,
      mongo_query: serialized_query,
    });
   },
  "click .edit-filter": function(event, instance){
    event.preventDefault();
    instance.editing.set(true);
  },
});
