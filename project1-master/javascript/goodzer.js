// for Goodzer API
var apiKey = "2e5bc66f2572e9f8f5a2444ecc8bc806";

// for Google Map API
var map;
var markers = [];   // Create a marker array to hold your markers

var myLatLng = {lat: 30.2672, lng: -97.7431};

var maxGoodzerItems = 6;

function initMap() {
    map = new google.maps.Map(document.getElementById('googlemap'), {
        center: myLatLng,
        zoom: 11
    });

    resetMarker();
}

function refreshMap() {
    // Set re-center and refresh map
    map.setCenter(myLatLng);
    google.maps.event.trigger(map, 'resize');
}

function resetMarker() {
    // Loop through markers and set map to null for each
    for (var i=0; i<markers.length; i++) {
        markers[i].setMap(null);
    }

    // Reset the markers array
    markers = [];    
}

function setMarker(lat, lng, name, website) {
    // Create a marker and set its position.
    var marker = new google.maps.Marker({
        map: map,
        position: {
            lat: lat,
            lng: lng
        },
        title: name,
        website: website
    });

    google.maps.event.addListener(marker, "click", function() {
        var content = name.replace(/\n/g, "<br>");

        var infowindow = new google.maps.InfoWindow({
            content: content
        });

        // infowindow.setContent("<p>" + content + "</p>");
        infowindow.open(map, marker);

        // window.open(website);
    });

    // Push marker to markers array
    markers.push(marker);    
}

$(document).ready(function() {
    // Initialized Firebase in amazon.js
    var database = firebase.database();

    $("#display-location").text("Location = (" + myLatLng.lat + ", " + myLatLng.lng + ")");

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            $("#display-location").text("Location = (" + position.coords.latitude + ", " + position.coords.longitude + ")");

            myLatLng.lat = position.coords.latitude;
            myLatLng.lng = position.coords.longitude;

            database.ref("/UserPosition").set(myLatLng);
        }, function(error) {
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    $("#display-location").text("User denied the request for Geolocation.");
                    break;
                case error.POSITION_UNAVAILABLE:
                    $("#display-location").text("Location information is unavailable.");
                    break;
                case error.TIMEOUT:
                    $("#display-location").text("The request to get user location timed out.");
                    break;
                case error.UNKNOWN_ERROR:
                    $("#display-location").text("An unknown error occurred.");
                    break;
            }
        });
    }
    else {
        $("#display-location").text("Geolocation is not supported by this browser.");
    }

    function runQuery(key) {
        var queryURL = "https://api.goodzer.com/products/v0.1/search_stores/?query=" + key + "&lat=" + parseFloat(myLatLng.lat) + "&lng=" + parseFloat(myLatLng.lng) + "&radius=5&priceRange=30:120&apiKey=" + apiKey;
        console.log(queryURL);

        // heroku workaround for Cors
        // var proxyUrl = 'https://cors-anywhere.herokuapp.com/';

        $.get(queryURL, function (resp) {
            console.log(resp);

            // clear data in Firebase
            database.ref("/GoodzerSearchItems").set({});

            var itemNo = 1;

            for(var i=0; i<resp.stores.length; i++) {
                database.ref("/GoodzerSearchItems").push({
                    tagid: "#display-goodzer" + itemNo,
                    id: resp.stores[i].products[0].id,
                    product: resp.stores[i].products[0],
                    store: resp.stores[i].name,
                    website: resp.stores[i].website,
                    location: resp.stores[i].locations[0]
                });

                itemNo++;
                if(itemNo > maxGoodzerItems) {
                    break;
                }
            }
        });

        // The AJAX function uses the queryURL and GETS the JSON data associated with it.
        // The data then gets stored in the variable called: "goodzerData"
        /*
        $.ajax({
            url: queryURL,
            method: "GET",
            dataType: "jsonp",
            crossOrigin: true
        }).done(function(goodzerData) {
            // Logging the URL so we have access to it for troubleshooting
            console.log("------------------------------------");
            console.log("URL: " + this.url);
            console.log("------------------------------------");

            // Log the goodzer to console, where it will show up as an object
            console.log(goodzerData);
            console.log("------------------------------------");
        });
        */
    }

    $("#select-search").on("click", function(event) {
        // prevents page from reloading
        event.preventDefault();

        // isNewSearch is defined in amazon.js
        if(isNewSearch) {
            // Grabbing text the user typed into the search input
            key = $("#data-keyword").val().trim();

            runQuery(key);

            // goto #amazon-section
            $('html, body').animate({
                scrollTop: $("#amazon-section").offset().top
            }, 800, function(){
                window.location.hash = "#amazon-section";
            });
        }
    });

    // When data in GoodzerSearchItems is changed
    database.ref("/GoodzerSearchItems").on("value", function(snap) {
        resetMarker();

        // Add data to table
        snap.forEach(function(childsnap) {
            var info = childsnap.val();

            var divMain = $("<div class='well item-info goodzer-item clearfix'>");

            var img = $("<img>");
            img.addClass("item-img");
            img.attr("src", info.product.image);
            divMain.append(img);

            divMain.append("<h5><strong>" + info.product.title + "</strong><h5>");

            divMain.append("<p>$ " + info.product.price + " at " + info.store +"</p>");

            var addr = info.location.address + ", " + info.location.city + ", " + info.location.state + " " + info.location.zipcode;
            divMain.append("<p>" + addr + "</p>");
            // divMain.append("<p>Tel: " + info.location.phone + "</p>");

            var divSub = $("<div>");
            var a = $("<a target='_blank'>");
            a.attr("href", info.product.url);
            a.text(info.product.url);
            divSub.append(a);
            divMain.append(divSub);

            $(info.tagid).empty();
            $(info.tagid).append(divMain);

            var storeInfo = info.store + "\n" + addr + "\n" + info.location.phone;
            setMarker(info.location.lat, info.location.lng, storeInfo, info.website);
        });

        refreshMap();
    });

    database.ref("/UserPosition").on("value", function(snap) {
        myLatLng = snap.val();

        refreshMap();
    });    
});

