window.DEBUG = true;

var App = function () {
    // init...

    /**
     * - Get user's geolocation
     * - Initialize the app's parts
     */

    // Create alias to `this`
    var self = this;

    // Get the user's geolocation
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(self.user.updatePosition);
    };
};

App.prototype.user = {
    position, // type: google.maps.LatLng
    closestStation,

    /**
     * - Updates the user's position
     * - Informs the rest of the app about the update
     */
    updatePosition: function (position) {
        this.user.position = position;
        if(window.DEBUG) console.log("Position updated", position);
    },
}

App = {
    map, // Google Map instance
    mapDisplay, // for showing routes on the map

    services: { // Google Maps services
        geocoder,
        directions
    },

    train: {
        stations,
    },

    /**
     * FUNCTIONS
     */
    ui: { // Everything that handles user input
        init: function () {}, // Sets up event handlers

        // User input handlers
        submitDest: function (event) {},

        // Display handlers
        showMap: function () {},
        showDirections: function(directionsResult, mapDisplay) {},
    },
    maps: {
        /**
         * Calculates directions
         *
         * @async
         * @param  {LatLng|String} from     Departure coordinates or address
         * @param  {LatLng|String} to       Arrival coordinates or address
         * @param  {Function}      calback
         */
        getDirections: function (from, to, callback) {
            // ...

            callback(directionsResult);
        },
    },
    rail: {
        init: function () {}, // Loads stations

        /**
         * Downloads a list of stations, using the iRail API
         *
         * @async
         * @param  {Function} callback The function to call when the stations have been loaded
         */
        getStations: function (callback) {
            // ...

            callback(stations);
        },

        /**
         * Finds the station that is closest to the given location
         *
         * @async
         * @param  {google.maps.LatLng}   location Location to search from
         * @param  {Function} callback The function to call when the station has been found
         */
        closestStation: function (location, callback) {
            // ...

            callback(station);
        },
    },
    utils: { // Handy stuff to make our life easier
        /**
         * Returns a google.maps.LatLng instance
         * for the given coordinates
         *
         * @param  {String|Float} x longitude
         * @param  {String|Float} y latitude
         * @return {google.maps.LatLng}   Usable for google API
         */
        latLng: function (x, y) {},

        /**
         * Searches for an address and returns the corresponding
         * coordinates.
         *
         * @async
         * @param  {String}   query    The address to search for
         * @param  {Function} callback The function to call when the coordinates have been found
         */
        getCoordinates: function(query, callback) {},
    }
}
