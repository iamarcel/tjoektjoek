'use strict';

/**
 * @class
 */
var Station = function (data) {
    this.id           = data.id;
    this.locationX    = data.locationX;
    this.locationY    = data.locationY;
    this.name         = data.name;
    this.standardname = data.standardname;

    this.lat = function () {
        return data.locationY;
    };
    this.lng = function () {
        return data.locationX;
    };
};

/**
 * @class
 */
var Connection = function(data) {
    this.departure = data.departure;
    this.vias = data.vias;
    this.arrival = data.arrival;

    this.duration = data.duration;

    // Convert to numbers
    var vars = ['delay', 'time', 'platform'];
    for (var i = vars.length - 1; i >= 0; i--) {
        this.departure[vars[i]] = parseFloat(data.departure[vars[i]]);
    }
};

/**
 * @class
 */
var Rail = function (options) {

    // VARIABLES
    this.url = {
        stations: 'http://api.irail.be/stations/',
        connections: 'http://api.irail.be/connections/'
    };
    this.stations = undefined;





    // FUNCTIONS
    this.errorHandler = options.errorHandler || console.log;

    /**
     * Set the `from` location. Finds connection if stationTo is defined
     * as well.
     * @param {Object}  station
     * @param {Object}  options  other options for findConnection()
     */
    this.setFrom = function (station, options) {
        this.stationFrom = new Station(station);

        if (this.stationTo) {
            options.from = this.stationFrom.standardname;
            options.to = this.stationTo.standardname;
            this.findConnection(options);
        }
    };

    /**
     * Set the `to` location. Finds connection if stationTo is defined
     * as well.
     * @param {Object} station
     * @param {Object}  options  other options for findConnection()
     */
    this.setTo = function (station, options) {
        this.stationTo = new Station(station);

        if (this.stationFrom) {
            options.from = this.stationFrom.standardname;
            options.to = this.stationTo.standardname;
            this.findConnection(options);
        }
    };

    /**
     * Clear the stationFrom and stationTo variables
     */
    this.clearConnectionStations = function () {
        this.stationFrom = undefined;
        this.stationTo = undefined;
    };

    /**
     * Fetches a list of stations from iRail
     * @param  {Object}           scope    Value for `this` in the callback
     * @param  {StationsCallback} callback Function to be executed on completion
     * @return undefined
     */
    this.getStations = function (scope, callback) {
        var self = this;

        // If the stations were already loaded, immediately give them back
        if (this.stations && typeof callback === 'function') {
            callback.apply(scope, [this.stations]);
            return;
        }

        // Load stations
        $.ajax({
            url: self.url.stations,
            async: true,
            dataType: 'json',
            data: {
                lang: 'NL',
                format: 'json'
            },
            success: function (data) {
                // Clear previous stations
                self.stations = [];

                // Create a Station object for each station
                // and append to self.stations
                for (var i = data.station.length - 1; i >= 0; i--) {
                    self.stations.push(new Station(data.station[i]));
                }

                // Call callback function with stations
                if (typeof callback === 'function') {
                    callback.apply(scope, [self.stations]);
                }
            },
            error: self.errorHandler
        });
    };

    /**
     * Finds a connection based on the options given
     * @param  {Object}   options  Options for searching
     * @param  {Object}   scope    Value for `this` in the callback
     * @param  {ConnectionCallback} callback
     * @return undefined
     */
    this.findConnection = function (options, scope, callback) {
        var self = this;

        // Check if options are present
        if (!options.from ||
            !options.to ||
            (options.time && !options.timeSel) ||
            (!options.time && options.timeSel)) {
            throw 'Incomplete options for findConnection()';
        }

        var requestData = {
            lang: 'NL',
            format: 'json',

            from: options.from,
            to: options.to,

            date: 271013
        };
        if (options.time && options.timeSel) {
            requestData.time = options.time;
            requestData.timeSel = options.timeSel;
        }

        // Request connections
        $.ajax({
            url: self.url.connections,
            async: true,
            dataType: 'json',
            data: requestData,
            success: function (data) {
                if (window.DEBUG) {
                    console.log('Connection data downloaded', data);
                }

                var connection = new Connection(data.connection[0]);
                var now = Math.floor(Date.now() / 1000);

                // Create connections object for each connection
                // At the same time, find the 'best' connection (
                // the one who departs last)
                for (var i = 0; i < data.connection.length; i++) {
                    var conn = new Connection(data.connection[i]);
                    if (connection.departure.time < conn.departure.time &&
                        conn.departure.time > now) {
                        // If this departs later, it's better
                        // (as long as it departs later than now)
                        connection = conn;
                    }
                }

                if (window.DEBUG) {
                    console.log('Connection found. ', connection);
                }

                if (typeof callback === 'function') {
                    callback.apply(scope, [connection]);
                }

                // TODO: Move this UI clutter to a separate function

                // Show information in modal
                var departureDate = new Date(parseInt(connection.departure["time"])*1000);
                $("#connection-departure-station").text(connection.departure.station);
                $("#connection-departure-time").text(departureDate);
                $("#connection-departure-platform").text(connection.departure.platform);

                var arrivalDate = new Date(parseInt(connection.arrival["time"])*1000);
                $("#connection-arrival-station").text(connection.arrival.station);
                $("#connection-arrival-time").text(arrivalDate);
                $("#connection-arrival-platform").text(connection.arrival.platform);

                // Show modal
                $("#connection-modal").modal();
            },
            error: self.errorHandler
        });
    };





    // INITIALIZATION
    // Fetch stations
    this.getStations();

};
