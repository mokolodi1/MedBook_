Patients = new Meteor.Collection("patients");

Patients.attachSchema(new SimpleSchema({
  collaborations: { type: [String] },

  patient_label: { type: String },

  samples: {
    type: [new SimpleSchema({
      sample_label: { type: String },

      // link to the genomic data
      data_set_id: { type: String },

      // quality_control: {
      //   type: new SimpleSchema({
      //     status: {
      //       type: String,
      //       allowedValues: [
      //         "accepted",
      //         "rejected",
      //       ],
      //
      //     },
      //   })
      // },
    })],
    defaultValue: [],
  },
}));
