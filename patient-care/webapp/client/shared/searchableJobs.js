// Template.searchableJobs

Template.searchableJobs.onCreated(function() {
  let instance = this;

  // search functionality

  instance.searchText = new ReactiveVar("");
  instance.loadedFirstTime = new ReactiveVar(false);

  // cachedSearchText keeps the search text before the debounced
  // function runs (which resubscribes and redoes the search client-side).
  // To set searchText: set cachedSearchText and then call debounceSearchText.
  // I did it this way because it's too annoying to debounce the whole
  // resubscribe function.
  instance.cachedSearchText = "";
  instance.debounceSearchText = _.debounce(() => {
    instance.searchText.set(instance.cachedSearchText);
  }, 150);

  // select mode functionality

  instance.selectMode = new ReactiveVar(false);
  instance.selectedIdMap = new ReactiveVar({});
  instance.onlyShowSelected = new ReactiveVar(false);
  instance.deleteClicked = new ReactiveVar(false);
  instance.deletingSelected = new ReactiveVar(false);

  // disable onlyShowSelected if none selected
  instance.autorun(() => {
    let idMap = instance.selectedIdMap.get();

    if (Object.keys(idMap).length === 0) {
      instance.onlyShowSelected.set(false);
    }
  });

  // pagination
  instance.pageIndex = new ReactiveVar(0);
  instance.maxPageIndex = new ReactiveVar(0);
  instance.rowsPerPage = new ReactiveVar(15);

  // reset pageIndex to 0 when needed
  // NOTE: this might cause a resubscribe if it fires after the
  // other autorun
  instance.autorun(() => {
    instance.searchText.get();
    instance.onlyShowSelected.get();
    instance.rowsPerPage.get();

    instance.pageIndex.set(0);
  });

  // figure out all the fields to fetch
  // store it in an instance variable so it can be used elsewhere
  instance.searchFields = _.flatten(_.map(instance.data.columns, (col) => {
    if (col.field) {
      return col.field;
    }

    return col.fields;
  }));

  // subscribe to the jobs
  instance.autorun(() => {
    let rowsPerPage = instance.rowsPerPage.get();

    let options = {
      jobName: instance.data.name,
      searchFields: instance.searchFields,
      limit: rowsPerPage,
      skip: rowsPerPage * instance.pageIndex.get(),
      query: instance.data.query,
      extraFields: instance.data.extraFields,
    };

    if (instance.onlyShowSelected.get()) {
      options.mongoIds = Object.keys(instance.selectedIdMap.get());
    } else {
      options.searchText = instance.searchText.get();
    }

    instance.subscribe("searchableJobs", options);
  });
});

Template.searchableJobs.onRendered(function () {
  let instance = this;

  // show/hide popup on search box
  instance.autorun(() => {
    let selectMode = instance.selectMode.get();

    if (selectMode) {
      $(".job-search-box").popup({
        content: "Searching won't clear your selections!"
      });
    } else {
      $(".job-search-box").popup("destroy");
    }
  });

  // show/hide popup when the delete button is clicked
  instance.autorun(() => {
    let deleteClicked = instance.deleteClicked.get();

    if (deleteClicked) {
      $(".delete-jobs").popup({
        content: "Click anywhere to cancel.",
        delay: {
          // wait 5 seconds before hiding
          hide: 5000
        },
      }).popup("show");
    } else {
      $(".delete-jobs").popup("destroy");
    }
  });
});

Template.searchableJobs.helpers({
  jobsQuery() {
    let instance = Template.instance();

    let query;
    if (instance.onlyShowSelected.get() || instance.deleteClicked.get()) {
      query = {
        _id: { $in: Object.keys(instance.selectedIdMap.get()) }
      };
    } else {
      let searchText = Template.instance().searchText.get();

      query = MedBook.regexFieldsQuery(instance.searchFields, searchText);
    }

    if (this.query) {
      _.extend(query, this.query);
    }

    query.name = this.name;

    return Jobs.find(query, {
      sort: { date_created: -1 }
    });
  },
  loadedFirstTime(subsReady) {
    // return false until it loads once, then always return true
    if (subsReady || Template.instance().loadedFirstTime.get()) {
      Template.instance().loadedFirstTime.set(true);

      return true;
    }
  },
  selectMode() { return Template.instance().selectMode.get(); },
  selectModeReactiveVar() { return Template.instance().selectMode; },
  selectedIdMap() { return Template.instance().selectedIdMap.get(); },
  selectedIdMapReactiveVar() { return Template.instance().selectedIdMap; },
  searchText() { return Template.instance().searchText.get(); },
  onlyShowSelected() { return Template.instance().onlyShowSelected.get(); },
  countSelected() {
    return Object.keys(Template.instance().selectedIdMap.get()).length;
  },
  deleteClicked() { return Template.instance().deleteClicked.get(); },
  deletingSelected() { return Template.instance().deletingSelected.get(); },

  // for use in the pagination
  paginationOptions() {
    let { pageIndex, maxPageIndex, rowsPerPage } = Template.instance();

    return {
      pageIndex,
      maxPageIndex,
      rowsPerPage,
      totalRowCount: Counts.get("searchable-jobs"),
    };
  },
});

Template.searchableJobs.events({
  "keyup .job-search"(event, instance) {
    instance.cachedSearchText = event.target.value;
    instance.debounceSearchText();
  },
  "click .toggle-select-mode"(event, instance) {
    instance.selectMode.set(!instance.selectMode.get());
  },
  "click .clear-selected"(event, instance) {
    instance.selectedIdMap.set({});
  },
  "click .clear-search-text"(event, instance) {
    instance.$(".job-search")[0].value = "";
    instance.searchText.set("");
  },
  "click .delete-jobs"(event, instance) {
    var deleteClicked = instance.deleteClicked;

    if (deleteClicked.get()) {
      let jobIds = Object.keys(instance.selectedIdMap.get());

      // make the button "loading" to tell the user we're working
      // super hard over here
      instance.deletingSelected.set(true);

      Meteor.call("removeObjects", "Jobs", jobIds,
          (error) => {
        instance.deletingSelected.set(false);

        if (!error) {
          // clear the list of selected jobs
          instance.selectedIdMap.set({});
        }
      });
    } else {
      deleteClicked.set(true);

      // if they click elsewhere, cancel remove
      // wait until propogation finishes before registering event handler
      Meteor.defer(() => {
        $("html").one("click", () => {
          deleteClicked.set(false);
        });
      });
    }
  },
  "click .share-jobs"(event, instance) {
    let jobIds = Object.keys(instance.selectedIdMap.get());

    Session.set("editCollaborationsCollection", "Jobs");
    Session.set("editCollaborationsMongoIds", jobIds);

    $(".edit-collaborations-modal").modal("show");
  },
  "click .toggle-show-only-selected"(event, instance) {
    instance.onlyShowSelected.set(!instance.onlyShowSelected.get());
  }
});

// Template.listSelectableJobs

Template.listSelectableJobs.onCreated(function () {
  let instance = this;

  // these don't have to be reactive
  instance.lastClickedId = null;
  instance.lastClickedDirection = false;

  // unset the lastClickedId whenever the data changes
  instance.autorun(() => {
    // I don't know if this is the best "change" event,
    // but it's good enough for now.
    let count = instance.data.jobsQuery.count();

    instance.lastClickedId = null;
  });
});

Template.listSelectableJobs.helpers({
  showColValue(job) {
    let { field, yes_no, func } = this;
    let value;

    if (field) {
      // break up the field if there's a dot
      // NOTE: currently only a single dot is supported
      if (field.indexOf(".") === -1) {
        value = job[field];
      } else {
        let splitAttributes = field.split(".");
        let intermediaryValue = job[splitAttributes[0]];

        if (intermediaryValue) {
          value = intermediaryValue[splitAttributes[1]];
        }
      }
    } else {
      value = func(job);
    }

    // convert to "Yes"/"No" if `yes_no`
    if (yes_no) {
      return value ? "Yes" : "No";
    }

    return value;
  },
  activeIfSelected() {
    let selectMode = Template.instance().data.selectMode.get();
    let selectedIdMap = Template.instance().data.selectedIdMap.get();

    if (selectMode &&
        selectedIdMap[this._id]) {
      return "active";
    }
  },
  selectMode() {
    return Template.instance().data.selectMode.get();
  },
  totalColumnsCount() {
    return this.columns.length + 1;
  },
});

Template.listSelectableJobs.events({
  "click .select-job"(event, instance) {
    if (instance.data.selectMode.get()) {
      let selectedIdMap = instance.data.selectedIdMap.get();

      // selection or deselection a given item
      const setState = function(mongoId, state) {
        if (state) {
          selectedIdMap[mongoId] = true;
        } else {
          delete selectedIdMap[mongoId];
        }
      };

      // if there's nothing selected and they hold shift treat it as
      // a new selection
      // NOTE: the long-term solution for this behaviour (I think)
      // is that if nothing is selected between lastClickedId and the
      // click and the lastClickedDirection is false, treat it as a
      // regular click
      if (event.shiftKey && instance.lastClickedId &&
          Object.keys(selectedIdMap).length > 0) {
        // grab _ids of all currently shown jobs
        const shownJobIds = _.pluck(instance.data.jobsQuery.fetch(), "_id");

        // figure out where they clicked and last clicked
        const lastClickedIndex = shownJobIds.indexOf(instance.lastClickedId);
        const justClickedIndex = shownJobIds.indexOf(this._id);

        // select or deselect accordingly
        const step = Math.sign(lastClickedIndex - justClickedIndex);
        const toSetIndexes = _.range(justClickedIndex, lastClickedIndex, step);

        _.each(toSetIndexes, (index) => {
          setState(shownJobIds[index], instance.lastClickedDirection);
        });
      } else {
        setState(this._id, !selectedIdMap[this._id]);

        // only change this if togglling a single item
        instance.lastClickedDirection = !!selectedIdMap[this._id];
      }

      // put the mutated _id map back into the reactive variable
      instance.data.selectedIdMap.set(selectedIdMap);

      // update the last-clicked location
      instance.lastClickedId = this._id;
    }
  },
});

// Template.tablePagination

Template.tablePagination.onCreated(function () {
  let instance = this;

  // keep track of if they're focussed on the input.results-per-page
  // and if there's an error in it
  instance.perPageFocus = new ReactiveVar(false);
  instance.perPageError = new ReactiveVar(false);

  // keep max page index up to date
  instance.autorun(function () {
    let { options } = Template.currentData();

    let totalRowCount = options.totalRowCount;
    let rowsPerPage = options.rowsPerPage.get();

    options.maxPageIndex.set(Math.floor((totalRowCount - 1) / rowsPerPage));
  });

  // if we've cached a rowsPerPage, show that number of jobs
  let { profile } = Meteor.user();
  if (profile &&
      profile.tablePagination &&
      profile.tablePagination.rowsPerPage) {
    instance.data.options.rowsPerPage.set(profile.tablePagination.rowsPerPage);
  }
});

Template.tablePagination.helpers({
  pageNumber: function () {
    // add one b/c index !== number
    return Template.instance().data.options.pageIndex.get() + 1;
  },
  maxPageNumber: function () {
    // add one b/c index !== number
    return this.options.maxPageIndex.get() + 1;
  },
  // generate the strings of the pages numbers to show
  pagesToShow: function () {
    let pageIndex = this.options.pageIndex.get();
    let maxPageIndex = this.options.maxPageIndex.get();

    // hash so as not to have dupes
    let pages = {
      1: true,
      // 2: true,
      // [maxPageIndex]: true,
      [maxPageIndex + 1]: true,

      // add 0, 1, 2 (not -1, 0, 1) b/c index + 1 = number
      [pageIndex]: true,
      [pageIndex + 1]: true,
      [pageIndex + 2]: true,
    };
    let pageNumbers = _.map(Object.keys(pages), (numString) => {
      return parseInt(numString, 10);
    });

    pageNumbers.sort((a, b) => {
      // sort by number: don't sort lexically
      return a - b;
    });

    // filter them to remove too smalls and too bigs
    let filteredNumbers = _.filter(pageNumbers, (num) => {
      return num > 0 && num <= maxPageIndex + 1;
    });

    // add the "..."s in between
    let withEllipsis = [
      filteredNumbers[0]
    ];
    for (let i = 1; i < filteredNumbers.length; i++) { // starts at one
      let currentNumber = filteredNumbers[i];
      let previousNumber = filteredNumbers[i - 1];

      if (previousNumber + 1 !== currentNumber) {
        // if it only skips one (2 ... 4), just show the number
        if (previousNumber + 2 === currentNumber) {
          withEllipsis.push(currentNumber - 1);
        } else {
          withEllipsis.push("...");
        }
      }
      withEllipsis.push(currentNumber);
    }

    return withEllipsis;
  },
  rowsPerPage() { return this.options.rowsPerPage.get(); },
});

Template.tablePagination.events({
  "click .next-page": function (event, instance) {
    let { pageIndex } = instance.data.options;

    pageIndex.set(pageIndex.get() + 1);
  },
  "click .previous-page": function (event, instance) {
    let { pageIndex } = instance.data.options;

    pageIndex.set(pageIndex.get() - 1);
  },
  "click .go-to-page": function (event, instance) {
    // for some reason this is a [[PrimitiveValue]] something-or-other
    let value = this.valueOf();

    if (value !== "...") {
      instance.data.options.pageIndex.set(value - 1);
    }
  },
  "focus .results-per-page"(event, instance) {
    instance.perPageFocus.set(true);
  },
  "blur .results-per-page"(event, instance) {
    instance.perPageFocus.set(false);
  },
  "keypress .results-per-page"(event, instance) {
    // only run if they pressed enter (aka 13, obviously)
    if (event.keyCode === 13) {
      let strValue = event.target.value;
      let newValue = parseInt(strValue, 10);

      // if the value is over 0 and the number is exactly the string entered
      // (newValue + "" converts the number to a string for comparison)
      if (newValue && newValue > 0 && newValue + "" === strValue &&
          newValue <= 250) {
        instance.data.options.rowsPerPage.set(newValue);

        // update the saved rowsPerPage
        Meteor.users.update(Meteor.userId(), {
          $set: {
            [ `profile.tablePagination.rowsPerPage` ]: newValue
          }
        });

        instance.perPageError.set(false);

        // blur the input they're in so they know it worked
        instance.$(".results-per-page").trigger("blur");
      } else {
        // if they're being annoying (wrong twice), remind them who's in charge
        if (instance.perPageError.get()) {
          instance.$('.reset-per-page').transition('bounce');
        }

        instance.perPageError.set(true);
      }
    }
  },
  "click .reset-per-page"(event, instance) {
    // set the value in the text box
    let oldValue = instance.data.options.rowsPerPage.get();
    let perPageInput = instance.$("input.results-per-page")[0];

    // If they're trying to put in something over 250, reset to 250
    // (instead of resetting it to the oldValue).
    // It's okay if parseInt returns NaN as this will be false.
    if (parseInt(perPageInput.value) > 250) {
      oldValue = 250;

      // update the rowsPerPage and the saved rowsPerPage
      instance.data.options.rowsPerPage.set(oldValue);
      
      Meteor.users.update(Meteor.userId(), {
        $set: {
          [ `profile.tablePagination.rowsPerPage` ]: oldValue
        }
      });
    }

    perPageInput.value = oldValue;

    instance.perPageError.set(false);
  },
  "submit .table-pagination"(event, instance) {
    // prevent form submit when they change the input
    event.preventDefault();
  },
});
