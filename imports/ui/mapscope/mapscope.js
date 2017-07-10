import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { ReactiveDict } from 'meteor/reactive-dict';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Mapbox } from 'meteor/communecter:mapbox';
import { $ } from 'meteor/jquery';
import { Blaze } from 'meteor/blaze';
import { Location } from 'meteor/djabatav:geolocation-plus';
import { _ } from 'meteor/underscore';

import { Events } from '../../api/events.js';
import { Organizations } from '../../api/organizations.js';
import { Projects } from '../../api/projects.js';
import { Poi } from '../../api/poi.js';
import { Classified } from '../../api/classified.js';
import { Citoyens } from '../../api/citoyens.js';

import { nameToCollection } from '../../api/helpers.js';

//submanager
import { listEventsSubs,listOrganizationsSubs,listProjectsSubs,listPoiSubs,listClassifiedSubs,listCitoyensSubs } from '../../api/client/subsmanager.js';

import { position } from '../../api/client/position.js';
import { queryGeoFilter } from '../../api/helpers.js';

import './mapscope.html';

window.Events = Events;
window.Organizations = Organizations;
window.Projects = Projects;
window.Poi = Poi;
window.Classified = Classified;
window.Citoyens = Citoyens;

const subs = {};
subs.events = listEventsSubs;
subs.organizations = listOrganizationsSubs;
subs.projects = listProjectsSubs;
subs.poi = listPoiSubs;
subs.classified = listClassifiedSubs;
subs.citoyens = listCitoyensSubs;

Template.mapCanvas.onCreated(function () {
  var self = this;
  self.ready = new ReactiveVar();

  //mettre sur layer ?
  Meteor.subscribe('citoyen');

  self.autorun(function(c) {
    Session.set("currentScopeId", Router.current().params._id);
  });

  //sub listEvents
  self.autorun(function(c) {
    const radius = position.getRadius();
    const latlngObj = position.getLatlngObject();
    if (radius && latlngObj) {
      let handle = subs[Router.current().params.scope].subscribe('geo.scope',Router.current().params.scope,latlngObj,radius);
      self.ready.set(handle.ready());
    }else{
      let city = Session.get('city');
      if(city && city.geoShape && city.geoShape.coordinates){
        let handle = subs[Router.current().params.scope].subscribe('geo.scope',Router.current().params.scope,city.geoShape);
        self.ready.set(handle.ready());
      }
    }

  });

});

Template.mapCanvas.onRendered(function () {
  var self = this;
  $(window).resize(function () {
    var h = $(window).height(), offsetTop = 40;
    $('#map_canvas').css('height', (h - offsetTop));
  }).resize();

  self.autorun(function (c) {
    IonLoading.show();
    if (self.ready.get()) {
      if (Mapbox.loaded()) {
        IonLoading.hide();
        c.stop();
      }
    }
  });

  self.autorun(function (c) {
    //if (self.ready.get()) {
      if (Mapbox.loaded()) {
        initialize($("#map_canvas")[0], 13);
        c.stop();
      }
    //}
  });

  if (self.liveQuery) {
    self.liveQuery.stop();
  }
  self.autorun(function (c) {
  if (self.ready.get()) {
  if (Mapbox.loaded()) {
  clearLayers();
  
  let inputDate = new Date();
  const collection = nameToCollection(Router.current().params.scope);
  let query={};
  query = queryGeoFilter(query);
  //query['created'] = {$gte : inputDate};
  console.log(query);
  if(Router.current().params.scope === 'events'){

  }
  query['geo'] = {$exists:1};
  self.liveQuery = collection.find(query).observe({
    added: function(event) {

      if(event && event.geo && event.geo.latitude){
        var containerNode = document.createElement('div');

        Blaze.renderWithData(Template.mapscopepopup, event, containerNode);
        var marker = new L.Marker([event.geo.latitude, event.geo.longitude], {
          _id: event._id._str,
          title: event.name,
          latitude : event.geo.latitude,
          longitude : event.geo.longitude,
          icon: selectIcon(event)
        }).bindPopup(containerNode).on('click', function(e) {
          console.log(e.target.options._id);
          map.panTo([e.target.options.latitude, e.target.options.longitude]);
          Session.set("selected", e.target.options._id);
        });
        addMarker(marker);
      }
    },
    changed: function(event) {
      console.log(event._id._str);
      if(event && event.geo && event.geo.latitude){
      var marker = markers[event._id._str];
      if (marker){
        if (map.hasLayer(marker)) map.removeLayer(marker);
        var containerNode = document.createElement('div');
        Blaze.renderWithData(Template.mapscopepopup, event, containerNode);
        var marker = new L.Marker([event.geo.latitude, event.geo.longitude], {
          _id: event._id._str,
          title: event.name,
          latitude : event.geo.latitude,
          longitude : event.geo.longitude,
          icon: selectIcon(event)
        }).bindPopup(containerNode).on('click', function(e) {
          console.log(e.target.options._id);
          map.panTo([e.target.options.latitude, e.target.options.longitude]);
          Session.set("selected", e.target.options._id);
        });
        addMarker(marker);
      }
    }
    },
    removed: function(event) {
      console.log(event._id._str);
      removeMarker(event._id._str);
    }
  });
}
}
})

});

Template.mapCanvas.onDestroyed(function () {
  var self = this;
  console.log('destroyed');
  Session.set('currentScopeId',false);
  map.remove();
  if (self.liveQuery) {
    self.liveQuery.stop();
  }
});


let clusters, map , markers = [ ];

const initialize = ( element, zoom, features ) => {
  let self = this;
  let city = Session.get('city');
  let geo = position.getLatlng();
  let options = {
  maxZoom: 18,
  tileLayer:false
  };
  if(geo && geo.latitude){
    L.mapbox.accessToken = Meteor.settings.public.mapbox;
    const tilejson = {
      tiles: ['https://api.mapbox.com/styles/v1/communecter/cj4tti8370rbg2smsl2trzmx9/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiY29tbXVuZWN0ZXIiLCJhIjoiY2l6eTIyNTYzMDAxbTJ3bng1YTBsa3d0aCJ9.elyGqovHs-mrji3ttn_Yjw'],
      minzoom: 0,
      maxzoom: 18
    };
    map = L.mapbox.map(element,tilejson,options);
    map.setView(new L.LatLng(parseFloat(geo.latitude), parseFloat(geo.longitude)), zoom);
    const layermapbox = L.tileLayer('https://api.mapbox.com/styles/v1/communecter/cj4tti8370rbg2smsl2trzmx9/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiY29tbXVuZWN0ZXIiLCJhIjoiY2l6eTIyNTYzMDAxbTJ3bng1YTBsa3d0aCJ9.elyGqovHs-mrji3ttn_Yjw').addTo(map);

    /*if(city && city.geoShape && city.geoShape.coordinates){
      console.log(JSON.stringify(city.geoShape));
      var featureLayer = L.mapbox.featureLayer({
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        geometry: city.geoShape
      }]
    }).addTo(map);
    console.log(featureLayer.getGeoJSON());
  }*/

    //var features = L.mapbox.featureLayer('mapbox.dc-markers').addTo(map);
    /*var stamenLayer = L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/toner/{z}/{x}/{y}.png', {
    attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, under <a href="http://creativecommons.org/licenses/by-sa/3.0">CC BY SA</a>.'
  }).addTo(map);*/

  var marker = L.marker(new L.LatLng(parseFloat(geo.latitude), parseFloat(geo.longitude)),{icon: L.mapbox.marker.icon({
    'marker-size': 'small',
    'marker-color': '#fa0'
  })}).bindPopup('Vous êtes ici :)');
  map.addLayer(marker);



  clusters = new L.MarkerClusterGroup();


//map.attributionControl.setPosition('bottomleft');


/*var directions = L.mapbox.directions();
directions.origin = {
type: 'Feature',
geometry: {
coordinates: [parseFloat(geo.latitude), parseFloat(geo.longitude)]
},
properties: {
query: [parseFloat(geo.latitude), parseFloat(geo.longitude)]
}
};
var directionsLayer = L.mapbox.directions.layer(directions)
.addTo(map);

var directionsInputControl = L.mapbox.directions.inputControl('inputs', directions)
.addTo(map);

var directionsErrorsControl = L.mapbox.directions.errorsControl('errors', directions)
.addTo(map);

var directionsRoutesControl = L.mapbox.directions.routesControl('routes', directions)
.addTo(map);

var directionsInstructionsControl = L.mapbox.directions.instructionsControl('instructions', directions)
.addTo(map);*/

/*const collection = nameToCollection(Router.current().params.scope);
let query={};
query = queryGeoFilter(query);
query['geo'] = {$exists:1};
collection.find({geo:{$exists:1}}).map(function(event){
  if(event && event.geo && event.geo.latitude){
  let containerNode = document.createElement('div');
  Blaze.renderWithData(Template.mapscopepopup, event, containerNode);
  let marker = new L.Marker([event.geo.latitude, event.geo.longitude], {
    _id: event._id._str,
    title: event.name,
    latitude : event.geo.latitude,
    longitude : event.geo.longitude,
    icon: L.mapbox.marker.icon({
      'marker-size': 'small',
      'marker-color': selectColor(event)
    })
  }).bindPopup(containerNode).on('click', function(e) {
    console.log(e.target.options._id);
    map.panTo([e.target.options.latitude, e.target.options.longitude]);
    Session.set("selected", e.target.options._id);
  });
  addMarker(marker);
  }
});*/
map.addLayer(clusters);

/*if(Session.get('currentScopeId')){
let event = Events.findOne({'_id._str':Session.get('currentScopeId')});
if(event && event.geo && event.geo.latitude){
directions.destination = {
type: 'Feature',
geometry: {
coordinates: [event.geo.latitude, event.geo.longitude]
},
properties: {
query: [event.geo.latitude, event.geo.longitude]
}
};
directions.query();
}
}*/


}
}



const inversePolygon = function(polygon){
  let inversedPoly = new Array();
  console.log("inversePolygon");
  if(typeof polygon != "undefined" && polygon != null){
    _.each(polygon, function(value){
      console.log(value[1]);
      let lat = value[0];
      let lng = value[1];
      inversedPoly.push(new Array(lat, lng));
    });
  }
  return inversedPoly;
};

const addMarker = (marker) => {
  //map.addLayer(marker);
  clusters.addLayer(marker);
  markers[marker.options._id] = marker;
  if (Session.get('currentScopeId') === marker.options._id) {
    console.log('marker open')
    marker.addTo(map).openPopup();
    map.panTo([marker.options.latitude, marker.options.longitude]);
    map.on('popupclose', function() {
      console.log('popupclose');
      map.removeLayer(marker);
    });
  }
}

const removeMarker = (_id) => {
  var marker = markers[_id];
  if (clusters.hasLayer(marker)) clusters.removeLayer(marker);
}

const clearLayers = () => {
  clusters.clearLayers();
}

const selectIcon = (event) => {
  if(event && event.profilMarkerImageUrl){
    return L.icon({
				    iconUrl: `${Meteor.settings.public.urlimage}${event.profilMarkerImageUrl}`,
				    iconSize: [53, 60], //38, 95],
				    iconAnchor: [27, 57],//22, 94],
				    popupAnchor: [0, -55]//-3, -76]
				});
  }else{

    const icoMarkersMap = { 			"default" 			: "",

										  	"city" 				: "city-marker-default",

											"news" 				: "NEWS_A",
											"idea" 				: "NEWS_A",
											"question" 			: "NEWS_A",
											"announce" 			: "NEWS_A",
											"information" 		: "NEWS_A",

											"citoyen" 			: "citizen-marker-default",
											"citoyens" 			: "citizen-marker-default",
											"people" 			: "citizen-marker-default",

											"NGO" 				: "ngo-marker-default",
											"organizations" 	: "ngo-marker-default",
											"organization" 		: "ngo-marker-default",

											"event" 			: "event-marker-default",
											"events" 			: "event-marker-default",
											"meeting" 			: "event-marker-default",

											"project" 			: "project-marker-default",
											"projects" 			: "project-marker-default",

											"markerPlace" 		: "map-marker",

											"poi" 				: "poi-marker-default",
											"poi.video" 		: "poi-video-marker-default",
											"poi.link" 			: "poi-marker-default",
											"poi.geoJson" 		: "poi-marker-default",
											"poi.compostPickup" : "poi-marker-default",
											"poi.sharedLibrary" : "poi-marker-default",
											"poi.artPiece" 		: "poi-marker-default",
											"poi.recoveryCenter": "poi-marker-default",
											"poi.trash" 		: "poi-marker-default",
											"poi.history" 		: "poi-marker-default",
											"poi.something2See" : "poi-marker-default",
											"poi.funPlace" 		: "poi-marker-default",
											"poi.place" 		: "poi-marker-default",
											"poi.streetArts" 	: "poi-marker-default",
											"poi.openScene" 	: "poi-marker-default",
											"poi.stand" 		: "poi-marker-default",
											"poi.parking" 		: "poi-marker-default",

											"entry" 			: "entry-marker-default",
											"action" 			: "action-marker-default",

											"url" 				: "url-marker-default",

											"address" 			: "MARKER",

											"classified" 		: "classified-marker-default"

									  };
    const assetPath = '/assets/fcb49fcf';
    const iconUrl = `${assetPath}/images/sig/markers/icons_carto/${icoMarkersMap[Router.current().params.scope]}.png`;
    return L.icon({
            iconUrl: `${Meteor.settings.public.urlimage}${iconUrl}`,
            iconSize: [53, 60], //38, 95],
            iconAnchor: [27, 57],//22, 94],
            popupAnchor: [0, -55]//-3, -76]
        });
  }

}

const selectColor = (event) => {
  let inputDate = new Date();
  if(event.startDate<inputDate && event.endDate<inputDate){
    return '#cccccc';
  }else if(event.startDate<=inputDate && event.endDate>inputDate){
    return '#33cd5f';
  }else{
    return '#324553';
  }
}
