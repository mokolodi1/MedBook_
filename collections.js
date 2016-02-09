Collaborations = new Meteor.Collection("collaboration");
Collaborations.attachSchema(new SimpleSchema({
  name: { type: String, unique: true },
  description: { type: String },

  collaborators: { type: [String] },
  administrators: { type: [String] },

  isUnlisted: { type: Boolean },
  invitations: { type: [String], optional: true },
  requests: { type: [String], optional: true },
  requiresAdministratorApprovalToJoin: { type: Boolean }
}));
