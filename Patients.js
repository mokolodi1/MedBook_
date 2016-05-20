Patients = new Meteor.Collection("patients");

Patients.attachSchema(new SimpleSchema({
  collaborations: { type: [String] },

  patient_label: { type: String },

  samples: {
    type: [new SimpleSchema({
      sample_label: { type: String },

      // link to the genomic data
      data_set_id: { type: String },

      // tumor map data (sample-level)
      // https://tumormap.ucsc.edu/query/queryApi.html#query-api-overlaynodes
      tumor_map_bookmarks: {
        type: [new SimpleSchema({
          map: { type: String },
          layout: { type:String },
          url: { type: String },
        })],
        optional: true,
      },
    })],
    defaultValue: [],
  },
}));
