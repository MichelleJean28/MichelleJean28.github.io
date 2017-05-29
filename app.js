(function () {
            "use strict";

    require([
            "esri/layers/TileLayer",        
        
            "dojo/dom",
            "dojo/dom-geometry",
            "dojo/has",
            "dojo/on",
            "dojo/parser",
            "dojo/ready",
            "dojo/window",
            "esri/geometry/Point",
            "esri/graphic",
            "esri/map",
	        "esri/symbols/PictureMarkerSymbol",
            "esri/arcgis/utils",
            "dijit/form/Button",
            "calcite-maps/calcitemaps-v0.3",
            "bootstrap/Collapse",
            "bootstrap/Dropdown",
            "bootstrap/Tab",
            "dojo/domReady!"
        ], function (TileLayer, dom, domGeom, has, on, parser, ready, win, Point, Graphic, Map, PictureMarkerSymbol, arcgisUtils, Button, CalciteMaps) {

        var map;
        var pt;
        var graphic;
        var watchId;
        var needleAngle, needleWidth, needleLength, compassRing;
        var renderingInterval = -1;
        var currentHeading;
        var hasCompass;
        var compassNeedleContext;
        var symbol;
        ready(function () {
            //alert("Ready function");
            parser.parse();

            var supportsOrientationChange = "onorientationchange" in window,
                orientationEvent = supportsOrientationChange ? "orientationchange" : "resize";

            window.addEventListener(orientationEvent, function () {
                orientationChanged();
            }, false);

            map = new Map("mapViewDiv", {
                basemap: "satellite",
                center: [-117.708, 33.523],
                zoom: 16,
                slider: false
            });
            
                var statesLayer = new TileLayer("https://tiles.arcgis.com/tiles/6FZUQ16zBFwjeNsQ/arcgis/rest/services/bucuresti2_WTL2/MapServer", {
                    outFields: ["*"]
                });


                map.addLayer(statesLayer);
            
            
            
            
            symbol = new PictureMarkerSymbol('symbol.png', 25, 25);
            var count = 1;
            
            var myButton = new Button({
                label: "Busola",
                onClick: function () {
                    if (count == 1)
                        {
                            count = 2;
                            mapLoadHandler();
                        }
                    else if (count == 2){
                        count = 3;
                        //map.graphics.clear();
                        map.graphics.hide();
                    }
                    else{
                        count = 2;
                        //mapLoadHandler();
                        //addGraphic(pt);
                        map.graphics.show();
                    }
                    
                }
            }, "CompassDiv").startup();
            //on(map, "load", mapLoadHandler);
            //loadCompass();
        });

        // The HTML5 geolocation API is used to get the user's current position.
        function mapLoadHandler() {
            on(window, 'resize', map, map.resize);
            // check if geolocaiton is supported
            if (navigator.geolocation) {
                navigator.geolocation.watchPosition(zoomToLocation, locationError);
            } else {
                alert("Browser doesn't support Geolocation. Visit http://caniuse.com to discover browser support for the Geolocation API.");
            }
        }

        function zoomToLocation(location) {
            //alert("Zoom to location");
            pt = esri.geometry.geographicToWebMercator(new Point(location.coords.longitude, location.coords.latitude));
            addGraphic(pt);
            map.centerAndZoom(pt, 17);
        }

        function showLocation(location) {
            //alert("Show location");
            pt = esri.geometry.geographicToWebMercator(new Point(location.coords.longitude, location.coords.latitude));
            if (!graphic) {
                addGraphic(pt);
            } else {
                //move the graphic if it already exists
                graphic.setGeometry(pt);
            }
            map.centerAt(pt);
        }

        function locationError(error) {
            //alert("Location error");
            //error occurred so stop watchPosition
            if (navigator.geolocation) {
                navigator.geolocation.clearWatch(watchId);
            }
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    alert("Location not provided");
                    break;

                case error.POSITION_UNAVAILABLE:
                    alert("Current location not available");
                    break;

                case error.TIMEOUT:
                    alert("Timeout");
                    break;

                default:
                    alert("unknown error");
                    break;
            }
        }

        // Add a pulsating graphic to the map
        function addGraphic(pt) {
            map.graphics.remove(graphic);
            symbol.setAngle(0);
            graphic = new Graphic(pt, symbol);
            map.graphics.add(graphic);
        }
        
        var myFunctions = dojo.getObject('myFunctions', true);
        myFunctions.removeAddGraphic = function (angle) {
                    map.graphics.remove(graphic);
            symbol.setAngle(angle);
            //var pt = esri.geometry.geographicToWebMercator(new Point(location.coords.longitude, location.coords.latitude));
            graphic = new Graphic(pt, symbol);
            map.graphics.add(graphic);
        }


        
        var orientationHandle;

        function orientationChangeHandler() {
            // An event handler for device orientation events sent to the window.
            orientationHandle = on(window, "deviceorientation", onDeviceOrientationChange);
            // The setInterval() method calls rotateNeedle at specified intervals (in milliseconds).
            renderingInterval = setInterval(rotateNeedle, 100);
        }

        var compassTestHandle;

        function hasWebkit() {
            if (has("ff") || has("ie") || has("opera")) {
                hasCompass = false;
                orientationChangeHandler();
                alert("Your browser does not support WebKit.");
            } else if (window.DeviceOrientationEvent) {
                compassTestHandle = on(window, "deviceorientation", hasGyroscope);
            } else {
                hasCompass = false;
                orientationChangeHandler();
            }
        }

        // Test if the device has a gyroscope.
        // Instances of the DeviceOrientationEvent class are fired only when the device has a gyroscope and while the user is changing the orientation.
        function hasGyroscope(event) {
            dojo.disconnect(compassTestHandle);
            if (event.webkitCompassHeading !== undefined || event.alpha != null) {
                hasCompass = true;
            } else {
                hasCompass = false;
            }
            orientationChangeHandler();
        }

        // Rotate the needle based on the device's current heading
        function rotateNeedle() {
            var multiplier = Math.floor(needleAngle / 360);
            var adjustedNeedleAngle = needleAngle - (360 * multiplier);
            var delta = currentHeading - adjustedNeedleAngle;
            if (Math.abs(delta) > 180) {
                if (delta < 0) {
                    delta += 360;
                } else {
                    delta -= 360;
                }
            }
            delta /= 5;
            needleAngle = needleAngle + delta;
            var updatedAngle = needleAngle - window.orientation;
            // rotate the needle
            dom.byId("compassNeedle").style.webkitTransform = "rotate(" + updatedAngle + "deg)";
        }

        function onDeviceOrientationChange(event) {
            var accuracy;
            if (event.webkitCompassHeading !== undefined) {
                // Direction values are measured in degrees starting at due north and continuing clockwise around the compass.
                // Thus, north is 0 degrees, east is 90 degrees, south is 180 degrees, and so on. A negative value indicates an invalid direction.
                currentHeading = (360 - event.webkitCompassHeading);
                accuracy = event.webkitCompassAccuracy;
            } else if (event.alpha != null) {
                // alpha returns the rotation of the device around the Z axis; that is, the number of degrees by which the device is being twisted
                // around the center of the screen
                // (support for android)
                currentHeading = (270 - event.alpha) * -1;
                accuracy = event.webkitCompassAccuracy;
            }

            if (renderingInterval == -1) {
                rotateNeedle();
            }
        }

    }      // END FUNCTION
    );     // END REQUIRE


    
    //set to true for debugging output       // NU POTI STERGE
    var debug = false;

    // our current position                      // NU POTI STERGE
    var positionCurrent = {
        lat: null,
        lng: null,
        hng: null
    };

    // elements that ouput our position                            // NU POTI STERGE
    var positionLat = document.getElementById("position-lat");
    var positionLng = document.getElementById("position-lng");
    var positionHng = document.getElementById("position-hng");

    // debug outputs                                                       // NU POTI STERGE
    var debugOrientation = document.getElementById("debug-orientation");
    var debugOrientationDefault = document.getElementById("debug-orientation-default");

    // if we have shown the heading unavailable warning yet
    var warningHeadingShown = false;

    // the orientation of the device on app load
    var defaultOrientation;

    // browser agnostic orientation                                       // NU POTI STERGE
    function getBrowserOrientation() {
        var orientation;
        if (screen.orientation && screen.orientation.type) {
            orientation = screen.orientation.type;
        } else {
            orientation = screen.orientation ||
                screen.mozOrientation ||
                screen.msOrientation;
        }

        return orientation;
    }

    // called on device orientation change                               // NU POTI STERGE
    function onHeadingChange(event) {
        var heading = event.alpha;

        if (typeof event.webkitCompassHeading !== "undefined") {
            heading = event.webkitCompassHeading; //iOS non-standard
        }

        var orientation = getBrowserOrientation();

        if (typeof heading !== "undefined" && heading !== null) { // && typeof orientation !== "undefined") {
            // we have a browser that reports device heading and orientation

            if (debug) {
                debugOrientation.textContent = orientation;
            }


            // what adjustment we have to add to rotation to allow for current device orientation
            var adjustment = 0;
            if (defaultOrientation === "landscape") {
                adjustment -= 90;
            }

            if (typeof orientation !== "undefined") {
                var currentOrientation = orientation.split("-");

                if (defaultOrientation !== currentOrientation[0]) {
                    if (defaultOrientation === "landscape") {
                        adjustment -= 270;
                    } else {
                        adjustment -= 90;
                    }
                }

                if (currentOrientation[1] === "secondary") {
                    adjustment -= 180;
                }
            }

            positionCurrent.hng = heading + adjustment;

            var phase = positionCurrent.hng < 0 ? 360 + positionCurrent.hng : positionCurrent.hng;
            positionHng.textContent = (360 - phase | 0);
            //alert(positionHng.textContent);
            myFunctions.removeAddGraphic(positionHng.textContent);

            // apply rotation to compass rose
            if (typeof symbol.style.transform !== "undefined") {
                symbol.style.transform = "rotateZ(" + positionCurrent.hng + "deg)";
            } else if (typeof symbol.style.webkitTransform !== "undefined") {
                symbol.style.webkitTransform = "rotateZ(" + positionCurrent.hng + "deg)";
            }
        } else {
            // device can't show heading

            positionHng.textContent = "n/a";
            showHeadingWarning();
        }
    }

    window.addEventListener("deviceorientation", onHeadingChange);      // NU POTI STERGE

}());      // END FUNCTION