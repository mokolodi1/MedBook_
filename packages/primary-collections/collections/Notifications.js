Notifications = new Meteor.Collection("notifications");
Notifications.attachSchema(new SimpleSchema({
  user_id: { type: String },

  // where to send the user if they click
  href: { type: String },

  // this can contain HTML: be careful!
  content: { type: String },

  // whether they've seen the notification in the list
  seen: { type: Boolean, defaultValue: false },

  // whether they've visited the href
  visited: { type: Boolean, defaultValue: false },

  // any valid semantic-ui icon class, excluding "icon"
  icon: { type: String, optional: true },

  date_created: { type: Date, autoValue: dateCreatedAutoValue },
}));
