'use strict';

/**
 * @class
 */
var Busy = function () {

    // PRIVATE VARIABLES
    // var self = this;

    // PUBLIC FUNCTIONS
    /**
     * Uses the FindMyWay API to find the amount of people in a point, on the
     * given time.
     * @param  {LatLng}    point
     * @param  {Date}      time
     * @param  {Function}  callback  args: [{Object} data]
     * @async
     */
    this.atPoint = function (point, time, callback) {
        /*
         1. Create strings for request
         */
        // Point
        var pointStr = '(' + point.lng() + ' ' +
            point.lat() + ')';

        // Time
        var timeStr = time.getHours() + ':' + time.getDay();

        /*
         2. Do AJAX request
         */
        $.ajax({
            url: 'http://movestud.ugent.be/~groep4/cgi-bin/Main.py',
            async: true,
            dataType: 'json',
            data: {
                destination: pointStr,
                time: timeStr
            },
            success: function (data) {
                if (window.DEBUG) {
                    console.log('Busy.atPoint() success', data);
                }

                callback.apply(this, [data]);
            },
            complete: function(xhr, status) {
                if (window.DEBUG) {
                    console.log('Busy.atPoint() complete', xhr, status);
                }
            }
        });

    };

    /**
     * Uses FindMyWay API to get average experimental speed over a route,
     * defined by an array of points
     * @param  {Array<LatLng>}   points
     * @param  {Date}            time
     * @param  {Function}        callback  args: [{Object} data]
     * @async
     */
    this.speed = function (points, time, callback) {
        /*
         1. Create strings for request
         */
        // Points
        var pointsStr = '';
        for (var i = points.length - 1; i >= 0; i--) {
            pointsStr += i + ':(' + points[i].lng() + ' ' +
                points[i].lat() + ')';
            if (i !== 0) {
                pointsStr += ';';
            }
        }

        // Time
        var timeStr = time.getHours() + ':' + time.getDay();

        // Radius
        var radius = 500;

        /*
         2. Do AJAX request
         */
        $.ajax({
            url: '//movestud.ugent.be/~groep4/cgi-bin/Main.py',
            async: true,
            dataType: 'json',
            data: {
                points: pointsStr,
                time: timeStr,
                radius: radius
            },
            success: function (data) {
                if (window.DEBUG) {
                    console.log('Busy.speed() success', data);
                }

                callback.apply(this, [data]);
            },
            complete: function(xhr, status) {
                if (window.DEBUG) {
                    console.log('Busy.speed() complete', xhr, status);
                }
            }
        });
    };

};
