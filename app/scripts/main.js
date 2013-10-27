/* global google */
'use strict';

window.DEBUG = true;

/**
 * @class
 */
var App = function () {
    var self = this;

    this.map = new Map({
        mapId: 'map'
    });
    this.rail = new Rail({

    });

    this.useTrain = true;
    this.travelMode = google.maps.TravelMode.WALKING;

    // Start a polyline
    this.stationsLine = new google.maps.Polyline({
        geodesic: true,
        strokeColor: '#333333',
        strokeOpacity: 1.0,
        strokeWeight: 2
    });
    this.stationsLine.setMap(this.map.map);

    /**
     * Calculate the route for the given user input
     */
    this.calcRoute = function () {
        var destination = $('#dest').val();

        var arrivalTime = $('#arrival-time').val();
        // Convert arrivalTime to nice format
        arrivalTime = ('0' + arrivalTime.substr(0, arrivalTime.indexOf(':')))
            .slice(-2) +
            ('0' + arrivalTime.substr(arrivalTime.indexOf(':'))).slice(-2);
        console.log('Arrival time:', arrivalTime);


        // Clear previous directions
        self.map.clearDirections();
        // Clear stationsLine
        self.stationsLine.getPath().clear();

        // Clear connectionStations
        self.rail.clearConnectionStations();

        if (self.useTrain === true) {
            // Show everything that needs to be visible
            $('.if-use-train').show();

            self.rail.getStations(self, function (stations) {
                var coords = [];
                for (var i = 0; i < stations.length; i++) {
                    coords[i] = this.map.latLng(stations[i]);
                }

                // Find closest station to here
                this.map.findClosest({
                    origin: this.map.position,
                    destinations: coords,
                    travelMode: self.travelMode
                }, self, function (closest) {
                    // Add point to stationsLine
                    self.stationsLine.getPath().push(closest);

                    // Set the `from` station
                    self.rail.setFrom(stations[closest.id], {
                        time: arrivalTime,
                        timeSel: 'arrive',
                        templateId: 'rail-template',
                        panelId: 'rail-panel'
                    });

                    self.map.getDirections({
                        origin: this.map.position,
                        destination: closest,
                        travelMode: self.travelMode
                    }, self, function (result) {
                        self.map.drawDirections(result, {
                            panelId: 'directions-panel-alpha'
                        });
                        $('#directions-modal').modal();
                    });
                });

                // Find closest station to destination
                this.map.findClosest({
                    origin: destination,
                    destinations: coords,
                    travelMode: self.travelMode
                }, self, function (closest) {
                    // Add point to stationsLine
                    self.stationsLine.getPath().push(closest);

                    // Set the `to` station
                    self.rail.setTo(stations[closest.id], {
                        time: arrivalTime,
                        timeSel: 'arrive',
                        templateId: 'rail-template',
                        panelId: 'rail-panel'
                    });

                    self.map.getDirections({
                        origin: closest,
                        destination: destination,
                        travelMode: self.travelMode
                    }, self, function (result) {
                        self.map.drawDirections(result, {
                            panelId: 'directions-panel-beta'
                        });
                        $('#directions-modal').modal();
                    });
                });
            });
        } else {
            // hide everything that needs to be visible
            $('.if-use-train').hide();

            // Just draw directions
            self.map.getDirections({
                origin: self.map.position,
                destination: destination,
                travelMode: self.travelMode
            }, self, function (result) {
                self.map.drawDirections(result, {
                    panelId: 'directions-panel-alpha'
                });
                $('#directions-modal').modal();
            });
        }
    };

    /**
     * Change the travel mode
     */
    this.updateTravelMode = function () {
        var modeAlpha = $('#travel-mode').val();
        var modeBeta  = $('#travel-mode-beta').val();

        if (modeAlpha === 'TRAIN') {
            self.useTrain = true;
            self.travelMode = google.maps.TravelMode[modeBeta];

            $('#travel-mode-beta-group').show();
        } else {
            self.useTrain = false;
            self.travelMode = google.maps.TravelMode[modeAlpha];

            $('#travel-mode-beta-group').hide();
            $('#travel-mode-beta').val(modeAlpha);
        }
    };


    // Bind to UI events
    $('#submit-dest').on('click', this.calcRoute);
    $('#travel-mode, #travel-mode-beta').on('change', this.updateTravelMode);
};

var app = new App();
