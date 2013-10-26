/* global google */
'use strict';

var Map = function (options) {

    // Check if proper options are present
    if (!options.mapId) {
        throw 'Incomplete options for `new Map()`';
    }

    // PRIVATE VARIABLES
    var self = this;
    var mapOptions = {
        zoom: 9,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        center: new google.maps.LatLng(0, 0)
    };





    // PUBLIC VARIABLES
    this.errorHandler = options.errorHandler || console.log;

    this.map = new google.maps.Map(
            document.getElementById(options.mapId), mapOptions);
    this.positionMarker = new google.maps.Marker({
        position: new google.maps.LatLng(0, 0),
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 7
        },
        draggable: false
    });

    this.geocoder = new google.maps.Geocoder();

    this.directionsService = new google.maps.DirectionsService();
    this.directionsRenderers = [];
    this.distanceMatrixService = new google.maps.DistanceMatrixService();

    this.positionWatchId = undefined;
    this.position = undefined;





    // FUNCTIONS
    /**
     * Calculates directions
     *
     * @async
     * @param  {Object}   options   Options for directons
     * @param  {Object}   scope     Value for `this` in the callback
     * @param  {DirectionsCallback} callback
     */
    this.getDirections = function(options, scope, callback) {
        // Check if proper options are present
        if (!options.origin ||
            !options.destination) {
            throw 'Incomplete options for `getDirections()`';
        }

        options.travelMode = options.travelMode ||
                        google.maps.TravelMode.WALKING;
        options.region = 'BE';

        this.directionsService.route(options, function(result, status) {
            if (window.DEBUG) {
                console.log('Directions requested. Result:', result);
            }

            if (status === google.maps.DirectionsStatus.OK) {
                if (typeof callback === 'function') {
                    callback.apply(scope, [result]);
                }
            } else {
                self.errorHandler(status);
            }
        });
    };

    /**
     * Finds the closest object from a list of coordinates
     * @param  {Object}   options
     * @param  {Object}   scope    Value of `this` for callback
     * @param  {Function} callback
     * @return undefined
     */
    this.findClosest = function (options, scope, callback) {
        var i,j;

        // Check if proper options are present
        if (!options.origin ||
            !options.destinations) {
            throw 'Incomplete options for `findClosest()`';
        }
        options.travelMode = options.travelMode ||
                google.maps.TravelMode.WALKING;

        var orig = options.origin;
        var dest = options.destinations;

        // Give each destination an ID
        for (i = dest.length - 1; i >= 0; i--) {
            dest[i].id = i;
        }

        // `from` needs to be a LatLng object, so if it isn't,
        // get its coordinates and run the function again
        if (typeof options.origin === 'string') {
            if (window.DEBUG) {
                console.log('`origin` is a string. Running getCoordinates()');
            }

            this.getCoordinates(options.origin, this, function (coords) {
                options.origin = coords;
                this.findClosest(options, this, callback);
            });
            return;
        }

        /*
         * Step 1
         * Find the 3 closest locations in birds' eye view
         */
        var closestAmount = 3;
        var closest = [];

        for (i = 0; i < dest.length; i++) {
            // Caulcate distance
            dest[i].dist = Math.pow(dest[i].lng() - orig.lng(), 2) +
                    Math.pow(dest[i].lat() - orig.lat(), 2);

            // Compare distances
            for (j = 0; j < closestAmount; j++) {
                if (!closest[j] || dest[i].dist < closest[j].dist) {
                    closest[j] = dest[i];
                    break;
                }
            }
        }

        /*
         * Step 2
         * We have the 3 closest stations in birds' eye view.
         * Now, request Google for the one with the least travel time.
         */
        this.distanceMatrixService.getDistanceMatrix({
            origins: [orig],
            destinations: closest,
            travelMode: options.travelMode
        }, function (response, status) {
            var nearest;

            if (status === google.maps.DistanceMatrixStatus.OK) {
                // Find the nearest object (= where the duration.value is least)
                for (var i = 0; i < response.rows[0].elements.length; i++) {
                    if (!nearest ||
                        nearest.duration.value >
                            response.rows[0].elements[i].duration.value) {
                        nearest = response.rows[0].elements[i];
                        nearest.id = closest[i].id;
                    }
                }

                if (window.DEBUG) {
                    console.log('Found the closest location.',
                        dest[nearest.id], nearest);
                }

                if (typeof callback === 'function') {
                    callback.apply(scope, [dest[nearest.id]]);
                }
            } else {
                throw status;
            }
        });
    };

    /**
     * Draws direction results on the map
     * @callback DirectionsCallback
     * @param  {DirectionsResult} directionsResult
     */
    this.drawDirections = function (directionsResult) {
        if (window.DEBUG) {
            console.log('Rendering directions...');
        }

        // Create new directionsRenderer
        var directionsRenderer = new google.maps.DirectionsRenderer({
            preserveViewport: true
        });
        // Bind directions result
        directionsRenderer.setDirections(directionsResult);
        // Bind to map
        directionsRenderer.setMap(self.map);

        // Add renderer to list of directionsRenderers
        self.directionsRenderers.push(directionsRenderer);
    };

    /**
     * Clears all previously rendered directions
     * @return {[type]} [description]
     */
    this.clearDirections = function () {
        // Clear previous routes
        for (var i = self.directionsRenderers.length - 1; i >= 0; i--) {
            self.directionsRenderers[i].setMap(null);
        }
        self.directionsRenderers = [];
    };

    /**
     * Returns a google.maps.LatLng instance
     * for the given coordinates
     *
     * @param  {String|Float|Object} x longitude, or object w/ coords
     * @param  {String|Float}        y latitude
     * @return {google.maps.LatLng}   Usable for google API
     */
    this.latLng = function (y, x) {
        if (typeof y === 'object') {
            if (y.locationX && y.locationY) {
                return new google.maps.LatLng(y.locationY, y.locationX);
            } else if (y.coords && y.coords.latitude && y.coords.longitude) {
                return new google.maps.LatLng(y.coords.latitude, y.coords.longitude);
            } else if (y.lb && y.mb) {
                return new google.maps.LatLng(y.lat(), y.lng());
            }
        } else {
            y = parseFloat(y);
            x = parseFloat(x);
            return new google.maps.LatLng(y, x);
        }
    };

    /**
     * Uses the Geocoder API to get the coordinates for a given address
     * @param  {String}   address  Address to search for
     * @param  {Object}   scope    Value of `this` for callback
     * @param  {Function} callback
     */
    this.getCoordinates = function(address, scope, callback) {
        this.geocoder.geocode({
            address: address
        }, function (results, status) {
            if (status === google.maps.GeocoderStatus.OK) {
                callback.apply(scope, [results[0].geometry.location]);
            } else {
                this.errorHandler(status);
            }
        });
    };

    /**
     * Update the user's position
     * @param  {Position} position From Geolocation API
     * @return undefined
     */
    this.updatePosition = function (position) {
        this.position = this.latLng(position);

        // Update marker position
        this.positionMarker.setPosition(this.position);
        // Update map center
        this.map.setCenter(this.position);

        if (window.DEBUG) {
            console.log('Position updated.', this.position);
        }
    };





    // INITIALIZATION
    // Set up position watching
    if (navigator.geolocation) {
        // Automatically watches the user's location
        // and calls updatePosition() when the position
        // has been updated.
        this.positionWatchId = navigator.geolocation.watchPosition(
            function (position) {
                self.updatePosition.apply(self, [position]);
            }
        );
    }

    // Bind position marker
    this.positionMarker.setMap(this.map);

    if (window.DEBUG) {
        /*
        // Draw test directions
        console.log('Drawing test directions...');
        this.getDirections({
            origin: 'Oudenaarde',
            destination: 'Ghent',
            travelMode: google.maps.TravelMode.WALKING
        }, this, this.drawDirections);
        */
    }


};
