import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { Push } from 'meteor/raix:push';
import { moment } from 'meteor/momentjs:moment';

import { ActivityStream } from '../../api/activitystream.js';

if(Meteor.isDevelopment){
Push.debug = true;
}

const pushUser = (title,text,payload,query,badge) => {
  const notId = Math.round(new Date().getTime() / 1000);
  //console.log(payload);
  Push.send({
    from: 'push',
    title: title,
    text: text,
    payload: payload,
    sound: 'default',
    query: query,
    badge: badge,
    apn: {
      sound: 'default'
    },
    notId: notId
  });
};

Meteor.startup(function(){

let query = {};
query['created'] = {$gt: new Date()};
let options = {};
options['sort'] = {created: 1};
var initNotifystart = ActivityStream.find(query,options).observe({
added: function(notification) {
  if(!initNotifystart) return ;
  //le serveur start donc la date est fixe on recupre les notifs qui sont créer aprés
  //mais ensuite
  //console.log(JSON.stringify(notification));
  if(notification && notification.notify && notification.notify.id && notification.notify.displayName){

  let title = 'notification';
  let text = notification.notify.displayName;

  let notifsId = _.map(notification.notify.id, function(ids,key){
    return key;
  });
  //verifier que présent dans Meteor.users
  let notifsIdMeteor = Meteor.users.find({_id:{$in:notifsId}},{fields:{_id:1}}).map((user) => user._id);
  console.log(notifsIdMeteor);
  if(notifsIdMeteor && notifsIdMeteor.length > 0){
  _.each(notifsIdMeteor,function(value){
    let query = {};
    query['userId'] = value;
    let payload = JSON.parse(JSON.stringify(notification));
    let badge = ActivityStream.api.queryUnseen(value).count();
    console.log({value,badge});
    pushUser(title,text,payload,query,badge)
  },title,text,notification);
  }
  }
}
});

});
