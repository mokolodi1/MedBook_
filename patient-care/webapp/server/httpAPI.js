// TODO: can we use Picker for this? (remove cfs:http-methods)

import Fuse from 'fuse.js';

HTTP.methods({
  "/search/collaborations": function() {
    const user = MedBook.ensureUser(this.userId);

    let query = this.query.q;
    if (!query) {
      query = "";
    }

    // calculate possible matching collaborations
    let collabDescriptions = Collaborations.find({
      name: { $in: user.getCollaborations() }
    }, {
      fields: { name: 1, description: 1 },
      sort: { name: 1 },
    }).map((collab) => {
      // set semantic-ui required variables
      collab.id = collab.name;
      collab.title = collab.name;
      collab.type = "collaboration";

      delete collab.name;

      return collab;
    });

    // TODO: perhaps limit this to people that you're
    // in collaborations with?
    let userDescriptions = Meteor.users.find({
      // only search users who have logged in since we
      // changed to the new collaboration schema
      "collaborations.personal": { $exists: 1 }
    }, {
      fields: {
        "collaborations.personal": 1,
        "profile.fullName": 1,
        "profile.preferredName": 1,
      },
      sort: {
        "profile.fullName": 1,
        "collaborations.personal": 1,
      }
    }).map((user) => {
      let description = {
        id: user.collaborations.personal,
        _id: user._id,
        description: user.collaborations.personal,
        type: "user",
      };

      // can't assume this will be present
      if (user.profile) {
        description.title = user.profile.fullName;
        description.preferredName = user.profile.preferredName;
      }

      return description;
    });

    if (query) {
      // NOTE: threshold of 0 requires perfect match, 1 matches everything
      let collabFuse = new Fuse(collabDescriptions, {
        keys: [ "title", "description" ],
        threshold: 0.3
      });
      collabDescriptions = collabFuse.search(query);

      let userFuse = new Fuse(userDescriptions, {
        keys: [ "title", "description", "preferredName" ],
        threshold: 0.3
      });
      userDescriptions = userFuse.search(query);
    }

    return {
      results: {
        collaborations: {
          name: "Collaborations",
          results: collabDescriptions,
        },
        users: {
          name: "People",
          results: userDescriptions
        }
      }
    };
  },
  "/search/data-sets": function () {
    const user = MedBook.ensureUser(this.userId);

    const regexQuery = {
      $regex: new RegExp(this.query.q, "i")
    };

    let dataSets = DataSets.find({
      $or: [
        // search both name and description
        // TODO: split into multiple words, search for each separately
        { name: regexQuery },
        { description: regexQuery },
      ],
      collaborations: { $in: user.getCollaborations() },
    }, {
      fields: {
        name: 1,
        description: 1
      },
      limit: 10,
      sort: {
        name: 1
      },
    });

    return {
      results: dataSets.map((dataSet) => {
        return {
          // id required for semantic ui (not required but that's what
          // it'll add on its own if it's not included)
          id: dataSet._id,
          title: dataSet.name,
          description: dataSet.description,
        };
      }),
    };
  },
});
