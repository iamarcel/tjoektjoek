(function () {

    var App = {
        map: undefined,
        dest: undefined,
        geocoder: new google.maps.Geocoder(),
        directionsService: new google.maps.DirectionsService(),
        mapDisplay: undefined,

        position: undefined,

        rail: {
            stations: undefined, // List of stations
            closest: undefined,
        },

        init: function () {
            // Get geolocation
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(function (position) {
                    App.position = position;
                    App.showMap();
                    App.getStations();
                });
            }

            // Set event listeners
            $("#submit-dest").on("click", function () {
                // App.setDest($("#dest").val());

                // Find closest station to dest
                App.getCoordinates($("#dest").val(), function (coord) {
                    App.getClosestStation(coord, function (closest) {

                        // Calculate route from station to destination
                        var station = new google.maps.LatLng(
                            parseFloat(closest.locationY),
                            parseFloat(closest.locationX)
                        );
                        App.setDest(station, coord);

                    });
                });
            });
        },

        /**
         * Returns a Google LatLng object
         * @param  {hash} coords with {latitude, longitude}
         * @return {google.maps.LatLng}
         */
        latLng: function (coords) {
            return new google.maps.LatLng(coords.latitude, coords.longitude);
        },

        /**
         * Returns the coordinates of a given address
         */
        getCoordinates: function (query, callback) {
            App.geocoder.geocode({
                'address': query
            }, function (results, status) {
                if (status == google.maps.GeocoderStatus.OK) {
                    callback(results[0].geometry.location);
                } else {
                    console.log("Geocoder error. ", status);
                }
            });
        },

        /**
         * Displays the map on the page
         * @return null
         */
        showMap: function() {
            App.mapDisplay = new google.maps.DirectionsRenderer();

            var options = {
                center: App.latLng(App.position.coords),
                zoom: 8,
                mapTypeId: google.maps.MapTypeId.ROADMAP
            };

            App.map = new google.maps.Map(document.getElementById("map"), options);
            App.mapDisplay.setMap(App.map);
        },

        /**
         * Shows directions on the map
         */
        setDest: function (origin, dest) {
            // Get directions
            var options = {
                origin: origin,
                destination: dest,
                travelMode: google.maps.TravelMode.DRIVING
            };

            App.directionsService.route(options, function(result, status) {
              if (status == google.maps.DirectionsStatus.OK) {
                App.mapDisplay.setDirections(result);
              } else {
                console.log("Directions error: ", status);
              }
            });
        },

        /**
         * Gets a list of the railway stations
         */
        getStations: function () {
            $.ajax({
                url: "http://api.irail.be/stations/?lang=NL&format=json",
                dataType: "json",
                type: "GET",
                success: function (data) {
                    App.rail.stations = data.station;
                    App.getClosestStation(App.latLng(App.position.coords));
                }
            });
        },

        /**
         * Find the closest station in birds' eye view
         */
        getClosestStation: function (from, callback) {
            var shortest = {
                dist: undefined
            };

            // Get coords from stations hash
            var coords = [];
            for (var i = App.rail.stations.length - 1; i >= 0; i--) {
                // Calculate distance
                var s = {
                    x: parseFloat(App.rail.stations[i].locationX),
                    y: parseFloat(App.rail.stations[i].locationY)
                };

                App.rail.stations[i].dist = Math.pow(s.x - from.mb, 2) + Math.pow(s.y - from.lb, 2);
                if (App.rail.stations[i].dist < shortest.dist || shortest.dist == undefined) {
                    shortest = App.rail.stations[i];
                };
            };

            //App.rail.closest = shortest;
            $("#closest-station").html(shortest.name);

            // Show route to closest station
            var loc = new google.maps.LatLng(shortest.locationY, shortest.locationX);
            App.setDest(new google.maps.LatLng(App.position.coords.latitude, App.position.coords.longitude), loc);

            callback(shortest);
        },
    };

    App.init();

})();
