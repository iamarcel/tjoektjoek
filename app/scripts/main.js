/* global google, Map, Rail, Busy, _, Station */
'use strict';

window.DEBUG = true;

/**
 * @class
 */
var App = function () {
    var self = this;

    var AMOUNT_OF_STATIONS_TO_CHECK = 3;
    var CONNECTION_MATRIX_SIZE = AMOUNT_OF_STATIONS_TO_CHECK*AMOUNT_OF_STATIONS_TO_CHECK;

    this.map = new Map({
        mapId: 'map'
    });
    this.rail = new Rail();
    this.busy = new Busy();

    this.useTrain = true;
    this.stations = {
        origin: undefined,
        destination: undefined
    };
    this.allStations = [];
    this.connections = [];
    this.connectionsCalculated = 0;

    this.travelMode = google.maps.TravelMode.WALKING;

    this.destination = '';

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
        $('#main-form').hide();
        $('.show-modal').show();

        self.destination = $('#dest').val();

        var arrivalTime = $('#arrival-time').val();

        var arrivalDate = new Date(Date.now());
        var hours = parseInt(arrivalTime.substr(0, arrivalTime.indexOf(':')), 10);
        var minutes = parseInt(arrivalTime.substr(arrivalTime.indexOf(':')+1), 10);

        arrivalDate.setHours(hours);
        arrivalDate.setMinutes(minutes);

        self.arrivalDate = arrivalDate;

        /**
         * Find the amount of people at arrival date
         */
        self.map.getCoordinates(self.destination, self, function (location) {
            self.busy.atPoint(location, arrivalDate, function (data) {
                $('#safe-to-leave').removeClass('alert-info');
                if (parseInt(data.idAmount,10) > 10) {
                    $('#safe-to-leave').addClass('alert-danger').html(
                        '<strong>Pas op!</strong> Het is superdruk, ik denk' +
                        ' dat er ' + data.idAmount + ' mensen zijn! Ben je zeker dat' +
                        ' je nu wil vertrekken?');
                } else {
                    $('#safe-to-leave').addClass('alert-success').html(
                        'Het is veilig, vertrek maar :)');
                }

                // Create heatmap of points
                self.map.createHeatmap(data.points);
            });
        });


        /**
         * Calculate routes and stuff
         */
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
                var stationObjects = [];
                for (var i = 0; i < stations.length; i++) {
                    stationObjects[i] = new Station(stations[i]);
                }

                // Find closest station to here
                this.map.findClosest({
                    origin: this.map.position,
                    destinations: stationObjects,
                    travelMode: self.travelMode,
                    amountToSend: AMOUNT_OF_STATIONS_TO_CHECK
                }, self, function (closestStations) {
                    self.setStations({
                        type: 'origin',
                        stations: closestStations
                    });

                    /*

                    // Add point to stationsLine
                    self.stationsLine.getPath().push(closest);

                    self.map.getDirections({
                        origin: this.map.position,
                        destination: closest,
                        travelMode: self.travelMode
                    }, self, function (result) {
                        this.toStationTime = new Date(parseInt(result.routes[0].legs[0].duration.value, 10) * 1000);

                        // Calculate train arrival time
                        var trainTime = new Date(arrivalDate.getTime() -
                            parseInt(result.routes[0].legs[0].duration.value, 10) * 1000);

                        if (window.DEBUG) {
                            console.log('Arrival time for train', trainTime.getHours() +':'+ trainTime.getMinutes());
                        }

                        // Set the `from` station
                        self.rail.setFrom(stations[closest.id], {
                            time: trainTime,
                            timeSel: 'arrive',
                            templateId: 'rail-template',
                            panelId: 'rail-panel'
                        }, self.calcFinalTime);

                        self.map.drawDirections(result, {
                            panelId: 'directions-panel-alpha'
                        });
                        $('#directions-modal').modal();

                        self.busy.speed(result.routes[0].overview_path, arrivalDate, function(data) {});
                    });
                    */
                });

                // Find closest station to destination
                this.map.findClosest({
                    origin: self.destination,
                    destinations: stationObjects,
                    travelMode: self.travelMode,
                    amountToSend: AMOUNT_OF_STATIONS_TO_CHECK
                }, self, function (closestStations) {
                    self.setStations({
                        type: 'destination',
                        stations: closestStations
                    });

                    /*
                    // Add point to stationsLine
                    self.stationsLine.getPath().push(closest);

                    // Set the `to` station
                    self.rail.setTo(stations[closest.id], {
                        timeSel: 'arrive',
                        templateId: 'rail-template',
                        panelId: 'rail-panel'
                    }, self.calcFinalTime);

                    self.map.getDirections({
                        origin: closest,
                        destination: destination,
                        travelMode: self.travelMode
                    }, self, function (result) {
                        self.map.drawDirections(result, {
                            panelId: 'directions-panel-beta'
                        });
                        $('#directions-modal').modal();

                        self.busy.speed(result.routes[0].overview_path, arrivalDate, function(data) {});
                    });
                    */
                });
            });
        } else {
            // hide everything that needs to be visible
            $('.if-use-train').hide();

            // Just draw directions
            self.map.getDirections({
                origin: self.map.position,
                destination: self.destination,
                travelMode: self.travelMode
            }, self, function (result) {
                self.toStationTime = new Date(parseInt(result.routes[0].legs[0].duration.value, 10) * 1000);
                self.calcFinalTime({
                    departure: {
                        time: arrivalDate.getTime() / 1000
                    }
                });

                self.map.drawDirections(result, {
                    panelId: 'directions-panel-alpha'
                });
                $('#directions-modal').modal();
            });
        }
    };

    /**
     * Set a station array. Will initialise matrix search when destination
     * and origin arrays are present
     */
    this.setStations = function (options) {
        self.stations[options.type] = options.stations;
        self.allStations = self.allStations.concat(options.stations);

        // Check if both arrays present
        var arrayNames = ['origin', 'destination'];
        var present = true;
        for (var i = arrayNames.length - 1; i >= 0; i--) {
            if (self.stations[arrayNames[i]] === undefined) {
                present = false;
                return;
            }
        }


        /*
           Find connections for al possible combinations
         */
        if (window.DEBUG) {
            console.log('  About to start finding the best connection: '+
                'starting station matrix calculation.');
        }
        for (i = self.stations.origin.length - 1; i >= 0; i--) {
            for (var j = self.stations.destination.length - 1; j >= 0; j--) {
                // For each combination, make a connection request to iRail.
                // when done, save them in our matrix.
                var requestData = {
                    lang: 'NL',
                    format: 'json',

                    from: self.stations.origin[i].standardname,
                    to: self.stations.destination[i].standardname
                };
                if (options.time && options.timeSel) {
                    requestData.time = '' + options.time.getHours() + options.time.getMinutes();
                    requestData.timeSel = options.timeSel;
                }

                // Request connections
                $.ajax({
                    url: self.rail.url.connections,
                    async: true,
                    dataType: 'json',
                    data: requestData,
                    success: self.parseConnectionResult,
                    error: self.errorHandler
                });

            }
        }
    };

    /**
     * Parse a connection request
     */
    this.parseConnectionResult = function (data) {
        if (window.DEBUG) {
            console.log('Connection data downloaded', data);
        }

        self.addConnections(data.connection);
    };

    /**
     * Add Connections to the list. Find the best one once all the connections
     * are in here.
     */
    this.addConnections = function (conns) {
        self.connections = self.connections.concat(conns);
        self.connectionsCalculated++;

        // When everything's done, we have a AMOUNT_OF_STATIONS_TO_CHECK^2
        // matrix.
        if (self.connectionsCalculated < CONNECTION_MATRIX_SIZE) {
            return;
        }

        // Find the best connection
        _.each(self.connections, function (el) {
            // Travel time to/from station
            //  1. Find stations
            var departureStation = _.find(self.allStations, function (station) {
                return station.data.id === el.departure.stationinfo.id;
            });
            var arrivalStation = _.find(self.allStations, function (station) {
                return station.data.id === el.arrival.stationinfo.id;
            });
            el.departureStation = departureStation;
            el.arrivalStation = arrivalStation;

            // Duration (seconds)
            var duration = parseInt(el.duration);
            // Time (seconds) too early
            var tooEarly = self.arrivalDate.getTime()/1000 - parseInt(el.arrival.time) - arrivalStation.travelTimeTo;
            if (tooEarly < 0) {
                tooEarly = Infinity;
                // If the train arrives AFTER our specified time limit, that's baaaaad.
            }
            // Vias
            var vias = 0;
            if (el.vias && el.vias.number) {
                vias = parseInt(el.vias.number);
            }

            el.score = (Math.log(duration) + Math.log(tooEarly) +
                    Math.log(departureStation.travelTimeTo)) *
                    (vias+1);
        });

        var bestConnection = _.min(self.connections, function (connection) {
            return connection.score;
        });

        if (window.DEBUG) {
            console.log('Connections', self.connections);
            console.log('Found best connection', bestConnection);

            console.log('Connections sorted by score (more -> less)',
                _.sortBy(self.connections, function (c) {
                    return c.score;
                }));
        }

        self.drawForConnection(bestConnection);
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

    this.calcFinalTime = function (connection) {
        var finalTime = new Date(parseInt(connection.departure.time,10) * 1000 - connection.departureStation.travelTimeTo*1000);

        $('#depart-time').html(finalTime.getHours() + ':' + ('0' + finalTime.getMinutes()).substr(-2));
    };

    /**
     * Displays all necessary data when the final connection has been found.
     * @param  {Connection} connection [description]
     */
    this.drawForConnection = function (connection) {
        if (window.DEBUG) {
            console.log('Drawing for connection: ', connection);
        }

        /*
           Draw directions to and from stations
         */
        self.map.getDirections({
            origin: self.map.position,
            destination: self.map.latLng(connection.departure.stationinfo),
            travelMode: self.travelMode
        }, self, function (result) {
            self.map.drawDirections(result, {
                panelId: 'directions-panel-beta'
            });
            $('#directions-modal').modal();

            // self.busy.speed(result.routes[0].overview_path, arrivalDate, function(data) {});
        });
        self.map.getDirections({
            origin: self.map.latLng(connection.arrival.stationinfo),
            destination: self.destination,
            travelMode: self.travelMode
        }, self, function (result) {
            self.map.drawDirections(result, {
                panelId: 'directions-panel-beta'
            });
            $('#directions-modal').modal();

            // self.busy.speed(result.routes[0].overview_path, arrivalDate, function(data) {});
        });

        /*
           Draw stations line
         */
        self.stationsLine.setPath([
            self.map.latLng(connection.departure.stationinfo),
            self.map.latLng(connection.arrival.stationinfo)
        ]);

        /*
           Display connection info
         */
        self.rail.drawConnectionInfo({
            templateId: 'rail-template',
            panelId: 'rail-panel',
            connection: connection
        });

        /*
           Calculate final time
         */
        self.calcFinalTime(connection);
    };


    $('.show-modal').hide();
    // Bind to UI events
    $('#submit-dest').on('click', this.calcRoute);
    $('#travel-mode, #travel-mode-beta').on('change', this.updateTravelMode);
};

var app = new App();
