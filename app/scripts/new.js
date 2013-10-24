window.DEBUG = true;

var App = function () {
    // Reference to `this`
    var self = this;

    this.user = {
        travelMode: google.maps.TravelMode.DRIVING,
    };
    this.maps = {
        initialized: false,

        geocoder: new google.maps.Geocoder(),
        directionsService: new google.maps.DirectionsService(),
        directionsRenderers: [],
        distanceMatrixService: new google.maps.DistanceMatrixService(),

        map: undefined,

        positionMarker: new google.maps.Marker({
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 7
            },
            draggable: false
        }),
    };
    this.rail = {
        to: undefined,
        from: undefined
    };

    // Set up location watching
    if (navigator.geolocation) {
        // Automatically watches the user's location
        // and calls updatePosition() when the position
        // has been updated.
        this.user.watchId = navigator.geolocation.watchPosition(function (position) {
            self.updatePosition(position, self);
        });
    }

    // Set up UI handlers
    $("#submit-dest").on("click", {self: this}, this.submitDest);
};

/**
 * Sets up the map for first use
 */
App.prototype.initMap = function() {
    if (this.maps.initialized === true) return;

    var options = {
        center: this.latLng(this.user.position),
        zoom: 9,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };

    this.maps.map = new google.maps.Map(document.getElementById("map"), options);

    // Bind positionMarker to map
    this.maps.positionMarker.setMap(this.maps.map);

    this.maps.initialized = true;
};

/**
 * Updates the user's position
 * @param  {Position} position the position object from the Geolocation API
 * @param  {Object}   scope    where to save the new information
 */
App.prototype.updatePosition = function(position, scope) {
    scope.user.position = position;
    if(window.DEBUG) console.log("Position updated", position);

    this.initMap();

    // Move marker on the map
    this.maps.positionMarker.setPosition(this.latLng(position));
};

/**
 * Calculates directions
 *
 * @async
 * @param  {LatLng|String} from     Departure coordinates or address
 * @param  {LatLng|String} to       Arrival coordinates or address
 * @param  {Function}      callback
 */
App.prototype.getDirections = function(from, to, callback) {
    var self = this;

    // Get directions
    var options = {
        origin: from,
        destination: to,
        travelMode: this.user.travelMode
    };

    this.maps.directionsService.route(options, function(result, status) {
      if (status == google.maps.DirectionsStatus.OK) {
        if (callback) callback(result);
      } else {
        console.log("Directions error: ", status);
      }
    });
};

/**
 * Returns the station closest to the coordinates in `from`
 *  1. Finds the closest 3 stations in birds' eye view
 *  2. Finds the one that's actually closest with the Maps API
 *
 * @param  {LatLng}   from     Coordinates to search from
 * @param  {Array}    stations List of stations
 * @param  {Function} callback
 */
App.prototype.getClosestStation = function(from, stations, callback) {
    var self = this;
    var placeholder = {dist: undefined};
    var closest = [placeholder, placeholder, placeholder];

    // `from` needs to be a LatLng object, so if it isn't,
    // get it's coordinates and run the function again
    if (typeof from == "string") {
        self.getCoordinates(from, function (coords) {
            self.getClosestStation(coords, stations, callback);
        });
        return;
    }

    /**
     * Step 1
     * Find the 3 closest stations in birds' eye view
     */
    for (var i = stations.length - 1; i >= 0; i--) {
        // Store the LatLng coordinates with the station
        stations[i].coords = self.latLng(stations[i]);
        // Store the distance to the station
        stations[i].dist = Math.pow(stations[i].coords.lng() - from.lng(), 2)
                + Math.pow(stations[i].coords.lat() - from.lat(), 2);

        // Compare distance to other closest distances
        if (stations[i].dist < closest[0].dist || closest[0].dist == undefined) {
            closest[0] = stations[i];
            closest[0].station = i;
        } else if (stations[i].dist < closest[1].dist || closest[1].dist == undefined) {
            closest[1] = stations[i];
            closest[1].station = i;
        } else if (stations[i].dist < closest[2].dist || closest[2].dist == undefined) {
            closest[2] = stations[i];
            closest[2].station = i;
        }
    };

    /**
     * Step 2
     * We have the 3 closest stations in birds' eye view.
     * Now, request Google for the one with the least travel time.
     */
    // Create array of coordinates
    var coords = [];
    for (var i = 0; i < closest.length; i++) {
        coords.push(closest[i].coords);
    };

    // Create DistanceMatrix request
    self.maps.distanceMatrixService.getDistanceMatrix({
        origins: [from],
        destinations: coords,
        travelMode: self.user.travelMode
    }, function (response, status) {
        self.parseDistanceMatrix(response, status, function (nearest) {
            nearest.station = stations[closest[nearest.index].station];
            if (callback) callback(nearest);
        });
    });
};

App.prototype.parseDistanceMatrix = function(response, status, callback) {
    if (status == google.maps.DistanceMatrixStatus.OK) {
        // Create placeholder for nearest object
        var nearest = {duration: {value: undefined}, index: undefined};

        if(window.DEBUG) console.log("Matrix Directions Result", response);

        // Find the nearest object (= where the duration.value is least)
        for (var i = 0; i < response.rows[0].elements.length; i++) {
            if (nearest.duration.value == undefined
                    || nearest.duration.value > response.rows[0].elements[i].duration.value) {
                nearest = response.rows[0].elements[i];
                nearestIndex = i;
            }
        };

        nearest.address = response.destinationAddresses[nearestIndex];
        nearest.index = nearestIndex;

        if (window.DEBUG) console.log("Nearest found: ", nearest);
        if (callback) callback(nearest);
    }
};


// UI
/**
 * Calculates two routes:
 *  - From current position to closest station
 *  - From (closest station to destination) to the destination
 * @param  {[type]} ev The "click" event
 */
App.prototype.submitDest = function(ev) {
    // For referencing other functions and data
    var self = ev.data.self;
    var pos = self.latLng(self.user.position);

    // Clear previous routes
    for (var i = self.maps.directionsRenderers.length - 1; i >= 0; i--) {
        self.maps.directionsRenderers[i].setMap(null);
    };
    self.maps.directionsRenderers = [];

    // Reset stations
    self.rail = {
        to: undefined,
        from: undefined
    };

    // Get stations
    self.getStations(function (stations) {
        // Station to dest
        self.getClosestStation($("#dest").val(), stations, function(nearest) {
            if (window.DEBUG) console.log("Closest station to destination", nearest.station);
            // Lookup timetables
            self.rail.to = nearest.station;
            self.findTrain();

            self.getDirections(nearest.address, $("#dest").val(), function(result) {
                // Create new directionsRenderer
                var directionsRenderer = new google.maps.DirectionsRenderer({
                    preserveViewport: true
                });
                // Bind directions result
                directionsRenderer.setDirections(result);
                // Bind to map
                directionsRenderer.setMap(self.maps.map);

                self.maps.directionsRenderers.push(directionsRenderer);
            });
        });

        // Station to here
        self.getClosestStation(pos, stations, function(nearest) {
            if (window.DEBUG) console.log("Closest station to here", nearest.station);
            // Lookup timetables
            self.rail.from = nearest.station;
            self.findTrain();

            self.getDirections(pos, nearest.address, function(result) {
                // Create new directionsRenderer
                var directionsRenderer = new google.maps.DirectionsRenderer({
                    preserveViewport: true
                });
                // Bind directions result
                directionsRenderer.setDirections(result);
                // Bind to map
                directionsRenderer.setMap(self.maps.map);

                self.maps.directionsRenderers.push(directionsRenderer);
            });
        });
    });

    // Adjust map zoom
    self.getCoordinates($("#dest").val(), function(coords) {
        var bounds = new google.maps.LatLngBounds(pos, coords);
        self.maps.map.fitBounds(bounds);
    })
};


// UTILITIES
/**
 * Returns a google.maps.LatLng instance
 * for the given coordinates
 *
 * @param  {String|Float|Object} x longitude, or hash with 'latitude' and 'longitude'
 * @param  {String|Float} y latitude
 * @return {google.maps.LatLng}   Usable for google API
 */
App.prototype.latLng = function (y, x) {
    if (typeof y === "object") {
        if (y.locationX && y.locationY) {
            return new google.maps.LatLng(y.locationY, y.locationX);
        } else if (y.coords.latitude && y.coords.longitude) {
            return new google.maps.LatLng(y.coords.latitude, y.coords.longitude);
        }
    } else {
        y = parseFloat(y);
        x = parseFloat(x);
        return new google.maps.LatLng(y, x);
    }
};

App.prototype.getCoordinates = function(query, callback) {
    this.maps.geocoder.geocode({
        'address': query
    }, function (results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
            callback(results[0].geometry.location);
        } else {
            console.log("Geocoder error. ", status);
        }
    });
};

App.prototype.getStations = function(callback) {
    $.ajax({
        url: "http://api.irail.be/stations/?lang=NL&format=json",
        dataType: "json",
        type: "GET",
        success: function (data) {
            if(callback) callback(data.station);
        }
    });
};

App.prototype.findTrain = function() {
    var self = this;
    if (self.rail.to == undefined || self.rail.from == undefined) return;

    if (window.DEBUG) console.log("About to search for connection between", self.rail.from, self.rail.to)

    $.ajax({
        url: "http://api.irail.be/connections/",
        dataType: "json",
        type: "GET",
        data: {
            lang: "NL",
            format: "json",
            from: self.rail.from.standardname,
            to: self.rail.to.standardname
        },
        success: function (data) {
            if (window.DEBUG) console.log("Got connections", data.connection);

            var connection = data.connection[0];
            // Show information in modal
            var departureDate = new Date(parseInt(connection.departure["time"])*1000);
            $("#connection-departure-station").text(connection.departure.station);
            $("#connection-departure-time").text(self.formatDate(departureDate));
            $("#connection-departure-platform").text(connection.departure.platform);

            var arrivalDate = new Date(parseInt(connection.arrival["time"])*1000);
            $("#connection-arrival-station").text(connection.arrival.station);
            $("#connection-arrival-time").text(self.formatDate(arrivalDate));
            $("#connection-arrival-platform").text(connection.arrival.platform);

            // Show modal
            $("#connection-modal").modal();
        }
    });
};

App.prototype.formatDate = function(date) {
    return ('0' + date.getHours()).slice(-2) + ':'
             + ('0' + date.getMinutes()).slice(-2);
};





// Start the app
var app = new App();
