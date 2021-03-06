import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker';
import { Router } from 'meteor/iron:router';
import { TAPi18n } from 'meteor/tap:i18n';
import { IonPopup } from 'meteor/meteoric:ionic';
import { pageVideo } from '../../api/client/reactive.js';

Meteor.startup(() => {
  pageVideo.set('showChat', false);
  pageVideo.set('showCaller', false);
  pageVideo.set('showTarget', false);

  Meteor.VideoCallServices.RTCConfiguration = { iceServers: [{
    urls: 'turn:numb.viagenie.ca',
    credential: 'codjab974',
    username: 'thomas.craipeau@gmail.com',
  }] };

  Tracker.autorun((c) => {
    if (Meteor.userId() && Meteor.user()) {
      Meteor.VideoCallServices.onReceivePhoneCall = (callerId) => {
        Meteor.call('getUser', callerId, (error, user) => {
          if (!error) {
            pageVideo.set('showChat', user._id._str);
            IonPopup.confirm({
              title: `<i class="icon fa fa-video-camera"></i> ${TAPi18n.__('You are receiving a phone call')}`,
              template: (user.profilThumbImageUrl ? `<div class="list card"><div class="item item-avatar"><img src="${Meteor.settings.public.urlimage}${user.profilThumbImageUrl}"> <h2>${user.name}</h2></div></div>` : `<div class="list card"><div class="item"><h2>${user.name}</h2></div></div>`),
              onOk() {
                pageVideo.set('showTarget', true);
                Router.go('videoRTC');
              },
              okText: `<i class="icon fa fa-phone"></i>`,
              okType: 'button-balanced',
              cancelText: `<i class="icon fa fa-times"></i>`,
              cancelType: 'button-assertive',
              onCancel() {
                pageVideo.set('showChat', false);
                pageVideo.set('showTarget', false);
                Meteor.VideoCallServices.endPhoneCall();
              },
            });
          }
        });
      };
      c.stop();
    }
  });
});
