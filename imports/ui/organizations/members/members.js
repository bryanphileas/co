import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Mongo } from 'meteor/mongo';
import { Router } from 'meteor/iron:router';

import { Citoyens } from '../../../api/citoyens.js';
import { Organizations } from '../../../api/organizations.js';

import './members.html';

Template.listMembers.onCreated(function () {
  const self = this;
  self.ready = new ReactiveVar();

  self.autorun(function() {
    const handle = Meteor.subscribe('listMembers', Router.current().params._id);
    self.ready.set(handle.ready());
  });
});

Template.listMembers.helpers({
  organizations () {
    return Organizations.findOne({ _id: new Mongo.ObjectID(Router.current().params._id) });
  },
  onlineMembers () {
    const user = Meteor.users.findOne({ _id: this._id._str });
    return user && user.profile && user.profile.online;
  },
  isFollowsMembers (followId) {
    if (Meteor.userId() === followId) {
      return true;
    }
    const citoyen = Citoyens.findOne({ _id: new Mongo.ObjectID(Meteor.userId()) }, { fields: { links: 1 } });
    return citoyen.links && citoyen.links.follows && citoyen.links.follows[followId];
  },
  dataReady() {
    return Template.instance().ready.get();
  },
});

Template.listMembers.events({
  'click .followperson-link' (event) {
    event.preventDefault();
    Meteor.call('followEntity', this._id._str, 'citoyens');
  },
  'click .unfollowperson-link' (event) {
    event.preventDefault();
    Meteor.call('disconnectEntity', this._id._str, 'citoyens');
  },
});
