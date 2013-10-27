/* global Handlebars */
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
    this.setFrom = function (station, options, callback) {
        this.stationFrom = new Station(station);

        if (this.stationTo) {
            options.from = this.stationFrom.standardname;
            options.to = this.stationTo.standardname;
            this.findConnection(options, this, callback);
        }
    };

    /**
     * Set the `to` location. Finds connection if stationTo is defined
     * as well.
     * @param {Object} station
     * @param {Object}  options  other options for findConnection()
     */
    this.setTo = function (station, options, callback) {
        this.stationTo = new Station(station);

        if (this.stationFrom) {
            options.from = this.stationFrom.standardname;
            options.to = this.stationTo.standardname;
            this.findConnection(options, this, callback);
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
            to: options.to
        };
        if (options.time && options.timeSel) {
            requestData.time = '' + options.time.getHours() + options.time.getMinutes();
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
                        conn.departure.time > now &&
                        conn.arrival.time < (options.time.getTime()/1000)) {
                        // If this departs later, it's better
                        // (as long as it departs later than now
                        // an later than the arrival time)
                        connection = conn;
                    }
                }

                if (window.DEBUG) {
                    console.log('Connection found. ', connection);
                }

                if (typeof callback === 'function') {
                    callback.apply(scope, [connection]);
                }

                options.connection = connection;
                self.drawConnectionInfo(options);
            },
            error: self.errorHandler
        });
    };

    /**
     * Shows connection info in info panel
     * @callback findConnection()
     * @param  {Object} options from findConnection()
     */
    this.drawConnectionInfo = function (options) {
        // Check if options are present
        if (!options.templateId ||
            !options.panelId ||
            !options.connection) {
            throw 'Incomplete options for drawConnectionInfo()';
        }

        var template = Handlebars.compile($('#' + options.templateId).html());
        var html = template(options.connection);

        $('#' + options.panelId).html(html);
    };





    // INITIALIZATION
    // Fetch stations
    this.getStations();

    // Register Handlebars helper for prettier time
    Handlebars.registerHelper('time', function (unixtime) {
        var time = new Date(unixtime * 1000);
        return time.getHours() + ':' + time.getMinutes();
    });

};
