(function () {
            "use strict";

    require([
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
        ], function (dom, domGeom, has, on, parser, ready, win, Point, Graphic, Map, PictureMarkerSymbol, arcgisUtils, Button, CalciteMaps) {

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

        // Convert degrees to radians
        function degToRad(deg) {
            return (deg * Math.PI) / 180;
        }

        // Handle portrait and landscape mode orientation changes
        function orientationChanged() {
            if (map) {
                map.reposition();
                map.resize();
            }
        }
    });


    //set to true for debugging output
    var debug = false;

    // our current position
    var positionCurrent = {
        lat: null,
        lng: null,
        hng: null
    };


    // the outer part of the compass that rotates
    //var rose = document.getElementById("rose");


    // elements that ouput our position
    var positionLat = document.getElementById("position-lat");
    var positionLng = document.getElementById("position-lng");
    var positionHng = document.getElementById("position-hng");


    // debug outputs
    var debugOrientation = document.getElementById("debug-orientation");
    var debugOrientationDefault = document.getElementById("debug-orientation-default");


    // info popup elements, pus buttons that open popups



    // buttons at the bottom of the screen



    // if we have shown the heading unavailable warning yet
    var warningHeadingShown = false;


    // switches keeping track of our current app state
    var isOrientationLockable = false;
    var isOrientationLocked = false;
    var isNightMode = false;


    // the orientation of the device on app load
    var defaultOrientation;


    // browser agnostic orientation
    function getBrowserOrientation() {
        var orientation;
        if (screen.orientation && screen.orientation.type) {
            orientation = screen.orientation.type;
        } else {
            orientation = screen.orientation ||
                screen.mozOrientation ||
                screen.msOrientation;
        }

        /*
          'portait-primary':      for (screen width < screen height, e.g. phone, phablet, small tablet)
                                    device is in 'normal' orientation
                                  for (screen width > screen height, e.g. large tablet, laptop)
                                    device has been turned 90deg clockwise from normal

          'portait-secondary':    for (screen width < screen height)
                                    device has been turned 180deg from normal
                                  for (screen width > screen height)
                                    device has been turned 90deg anti-clockwise (or 270deg clockwise) from normal

          'landscape-primary':    for (screen width < screen height)
                                    device has been turned 90deg clockwise from normal
                                  for (screen width > screen height)
                                    device is in 'normal' orientation

          'landscape-secondary':  for (screen width < screen height)
                                    device has been turned 90deg anti-clockwise (or 270deg clockwise) from normal
                                  for (screen width > screen height)
                                    device has been turned 180deg from normal
        */

        return orientation;
    }


    // browser agnostic orientation unlock
    function browserUnlockOrientation() {
        if (screen.orientation && screen.orientation.unlock) {
            screen.orientation.unlock();
        } else if (screen.unlockOrientation) {
            screen.unlockOrientation();
        } else if (screen.mozUnlockOrientation) {
            screen.mozUnlockOrientation();
        } else if (screen.msUnlockOrientation) {
            screen.msUnlockOrientation();
        }
    }


    // browser agnostic document.fullscreenElement
    function getBrowserFullscreenElement() {
        if (typeof document.fullscreenElement !== "undefined") {
            return document.fullscreenElement;
        } else if (typeof document.webkitFullscreenElement !== "undefined") {
            return document.webkitFullscreenElement;
        } else if (typeof document.mozFullScreenElement !== "undefined") {
            return document.mozFullScreenElement;
        } else if (typeof document.msFullscreenElement !== "undefined") {
            return document.msFullscreenElement;
        }
    }


    // browser agnostic document.documentElement.requestFullscreen
    function browserRequestFullscreen() {
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
        } else if (document.documentElement.webkitRequestFullscreen) {
            document.documentElement.webkitRequestFullscreen();
        } else if (document.documentElement.mozRequestFullScreen) {
            document.documentElement.mozRequestFullScreen();
        } else if (document.documentElement.msRequestFullscreen) {
            document.documentElement.msRequestFullscreen();
        }
    }


    // browser agnostic document.documentElement.exitFullscreen
    function browserExitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }


    // called on device orientation change
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

    function showHeadingWarning() {
        if (!warningHeadingShown) {
            popupOpen("noorientation");
            warningHeadingShown = true;
        }
    }

    function onFullscreenChange() {
        if (isOrientationLockable && getBrowserFullscreenElement()) {
            if (screen.orientation && screen.orientation.lock) {
                screen.orientation.lock(getBrowserOrientation()).then(function () {}).catch(function () {});
            }
        } else {
            lockOrientationRequest(false);
        }
    }

    function toggleOrientationLockable(lockable) {
        isOrientationLockable = lockable;

        if (isOrientationLockable) {
            btnLockOrientation.classList.remove("btn--hide");

            btnNightmode.classList.add("column-25");
            btnNightmode.classList.remove("column-33");
            btnMap.classList.add("column-25");
            btnMap.classList.remove("column-33");
            btnInfo.classList.add("column-25");
            btnInfo.classList.remove("column-33");
        } else {
            btnLockOrientation.classList.add("btn--hide");

            btnNightmode.classList.add("column-33");
            btnNightmode.classList.remove("column-25");
            btnMap.classList.add("column-33");
            btnMap.classList.remove("column-25");
            btnInfo.classList.add("column-33");
            btnInfo.classList.remove("column-25");
        }
    }

    function checkLockable() {
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock(getBrowserOrientation()).then(function () {
                toggleOrientationLockable(true);
                browserUnlockOrientation();
            }).catch(function (event) {
                if (event.code === 18) { // The page needs to be fullscreen in order to call lockOrientation(), but is lockable
                    toggleOrientationLockable(true);
                    browserUnlockOrientation(); //needed as chrome was locking orientation (even if not in fullscreen, bug??)
                } else { // lockOrientation() is not available on this device (or other error)
                    toggleOrientationLockable(false);
                }
            });
        } else {
            toggleOrientationLockable(false);
        }
    }

    function lockOrientationRequest(doLock) {
        if (isOrientationLockable) {
            if (doLock) {
                browserRequestFullscreen();
                lockOrientation(true);
            } else {
                browserUnlockOrientation();
                browserExitFullscreen();
                lockOrientation(false);
            }
        }
    }

    function lockOrientation(locked) {
        if (locked) {
            btnLockOrientation.classList.add("active");
        } else {
            btnLockOrientation.classList.remove("active");
        }

        isOrientationLocked = locked;
    }

    function toggleOrientationLock() {
        if (isOrientationLockable) {
            lockOrientationRequest(!isOrientationLocked);
        }
    }

    function locationUpdate(position) {
        positionCurrent.lat = position.coords.latitude;
        positionCurrent.lng = position.coords.longitude;

        positionLat.textContent = decimalToSexagesimal(positionCurrent.lat, "lat");
        positionLng.textContent = decimalToSexagesimal(positionCurrent.lng, "lng");
    }

    function locationUpdateFail(error) {
        positionLat.textContent = "n/a";
        positionLng.textContent = "n/a";
        console.log("location fail: ", error);
    }

    function setNightmode(on) {

        if (on) {
            btnNightmode.classList.add("active");
        } else {
            btnNightmode.classList.remove("active");
        }

        window.setTimeout(function () {
            if (on) {
                document.documentElement.classList.add("nightmode");
            } else {
                document.documentElement.classList.remove("nightmode");
            }
        }, 1);


        isNightMode = on;
    }

    function toggleNightmode() {
        setNightmode(!isNightMode);
    }

    function openMap() {
        window.open("https://www.google.com/maps/place/@" + positionCurrent.lat + "," + positionCurrent.lng + ",16z", "_blank");
    }

    function popupOpenFromClick(event) {
        popupOpen(event.currentTarget.dataset.name);
    }

    function popupOpen(name) {
        var i;
        for (i = 0; i < popupInners.length; i++) {
            popupInners[i].classList.add("popup__inner--hide");
        }
        document.getElementById("popup-inner-" + name).classList.remove("popup__inner--hide");

        popup.classList.add("popup--show");
    }

    function popupClose() {
        popup.classList.remove("popup--show");
    }

    function popupContentsClick(event) {
        event.stopPropagation();
    }

    function decimalToSexagesimal(decimal, type) {
        var degrees = decimal | 0;
        var fraction = Math.abs(decimal - degrees);
        var minutes = (fraction * 60) | 0;
        var seconds = (fraction * 3600 - minutes * 60) | 0;

        var direction = "";
        var positive = degrees > 0;
        degrees = Math.abs(degrees);
        switch (type) {
            case "lat":
                direction = positive ? "N" : "S";
                break;
            case "lng":
                direction = positive ? "E" : "W";
                break;
        }

        return degrees + "° " + minutes + "' " + seconds + "\" " + direction;
    }

    if (screen.width > screen.height) {
        defaultOrientation = "landscape";
    } else {
        defaultOrientation = "portrait";
    }
    if (debug) {
        debugOrientationDefault.textContent = defaultOrientation;
    }

    window.addEventListener("deviceorientation", onHeadingChange);

    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);
    document.addEventListener("mozfullscreenchange", onFullscreenChange);
    document.addEventListener("MSFullscreenChange", onFullscreenChange);

    btnLockOrientation.addEventListener("click", toggleOrientationLock);
    btnNightmode.addEventListener("click", toggleNightmode);
    btnMap.addEventListener("click", openMap);

    var i;
    for (i = 0; i < btnsPopup.length; i++) {
        btnsPopup[i].addEventListener("click", popupOpenFromClick);
    }

    popup.addEventListener("click", popupClose);
    popupContents.addEventListener("click", popupContentsClick);

    navigator.geolocation.watchPosition(locationUpdate, locationUpdateFail, {
        enableHighAccuracy: true,
        maximumAge: 30000,
        timeout: 27000
    });

    setNightmode(false);
    checkLockable();

}());