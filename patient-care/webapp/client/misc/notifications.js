// Template.notificationsMenuItem

Template.notificationsMenuItem.onCreated(function () {
  let instance = this;

  // resubscribe when the userId changes
  instance.autorun(() => {
    if (Meteor.userId()) {
      instance.subscribe("notifications");
      instance.subscribe("unseenNotifications");
    }
  });

  // TODO: maybe set a notification about a page as "visited" when the
  // user visits that page
});

Template.notificationsMenuItem.onRendered(function () {
  let instance = this;

  // show the notifications popup
  instance.$("#view-notifications").popup({
    on: "click",
    position: "bottom center",
    duration: 100,
    onShow() {
      Meteor.call("viewedNotificationsList");
    },
  });
});

Template.notificationsMenuItem.helpers({
  unseenCount() {
    return Counts.get("unseen-notifications");
  },
  getNotifications() {
    let now = new Date();

    return Notifications.find({}, {
      sort: { date_created: -1 },
      limit: 10,
    });
  },
});

// Template.notificationItem

Template.notificationItem.helpers({
  formatDate(date) {
    // If more than a week ago, format with date. Otherwise with
    // "5 hours ago", "a few seconds ago", etc.
    if (new Date() - date > 7 * 24 * 60 * 60 * 1000) {
      return moment(date).format("MMM Do, YYYY");
    } else {
      return moment(date).fromNow();
    }
  },
});

Template.notificationItem.events({
  "click .visit-notification"(event, instance) {
    Meteor.call("visitedNotification", this._id);

    instance.$("#view-notifications").popup("hide");
  },
});

// Template.viewAllNotifications

Template.viewAllNotifications.onCreated(function () {
  let instance = this;

  instance.loaded = new ReactiveVar(0);
  instance.limit = new ReactiveVar(50);

  instance.autorun(function () {
    let limit = instance.limit.get();

    instance.subscribe("notifications", limit, {
      onReady() {
        instance.loaded.set(limit);
      }
    });
  });
});

Template.viewAllNotifications.helpers({
  firstTimeLoading() {
    // flip to true once the subscription has loaded once
    let instance = Template.instance();

    if (instance.subscriptionsReady()) {
      instance.loadedOnce = true;
    }

    return instance.loadedOnce;
  },
  getNotifications() {
    return Notifications.find({}, {
      limit: Template.instance().loaded.get()
    });
  },
  thereMightBeMore() {
    return Notifications.find().count() >= Template.instance().limit.get();
  },
});

Template.viewAllNotifications.events({
  "click .load-more"(event, instance) {
    instance.limit.set(instance.limit.get() + 50);
  },
});
