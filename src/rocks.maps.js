(function ($) {

    $.fn.rocksMaps = function (methodName) {

        var fn = $.rockMaps[methodName];
        if (fn != null) {
            var args = $.makeArray(arguments).slice(1);
            return fn.apply(this, args);
        }

    };

    $.rockMaps = $.rockMaps || {};
    $.extend($.rockMaps, {

        createMap: function () {
            var center = new google.maps.LatLng(-23.548724, -46.739416);

            var map = new google.maps.Map(this[0], {
                zoom: 10,
                center: center,
                mapTypeId: google.maps.MapTypeId.ROADMAP
            });
            map.enableKeyDragZoom();

            $(this).data("rocksMaps", { map: map });
        },

        getMap: function() {
            var data = $(this).data("rocksMaps");
            return data.map;
        },

        createList: function (listName, options) {
            var data = $(this).data("rocksMaps");

            if (data.markerLists == undefined) {
                data.markerLists = {};
            }

            data.markerLists[listName] = new $.rockMaps.MarkerList(data.map, options);

            $(this).data("rocksMaps", data);
        },

        clearList: function (listName) {
            var data = $(this).data("rocksMaps");
            data.markerLists[listName].clear();
        },

        addMarker: function (listName, markerOptions) {

            var that = this;

            if (Object.prototype.toString.call(markerOptions) === '[object Array]') {
                for (var i = 0; i < markerOptions.length; i++) {
                    $.rockMaps.addMarker.call(this, listName, markerOptions[i]);
                }

                return;
            }

            var latLng = new google.maps.LatLng(markerOptions.position.lat, markerOptions.position.lng);
            var icon = new google.maps.MarkerImage(markerOptions.iconUrl, new google.maps.Size(35, 50), new google.maps.Point(0, 0), new google.maps.Point(14, 48));

            var data = $(this).data("rocksMaps");

            if (data.markerLists == undefined) {
                data.markerLists = {};
            }

            if (data.markerLists[listName] == undefined) {
                data.markerLists[listName] = new $.rockMaps.MarkerList(data.map);
            }

            var options = {
                position: latLng,
                map: data.map,
                icon: icon
            };

            $.extend(markerOptions, options);

            var marker = new google.maps.Marker(markerOptions);

            if (markerOptions.dblclick != undefined) {
                google.maps.event.addListener(marker, "dblclick", markerOptions.dblclick);
            }

            if (markerOptions.infoWindow != undefined) {

                marker.infoWindow = new google.maps.InfoWindow({
                    content: markerOptions.infoWindow
                });

                google.maps.event.addListener(marker, 'click', function () {

                    for (var list in data.markerLists) {
                        $.rockMaps._executeAgainstMarkers.call(that, list, undefined, function (_marker) {
                            if (_marker.infoWindow != undefined) {
                                _marker.infoWindow.close();
                            }
                        });

                        var listMarkers = data.markerLists[list];
                        
                        if (listMarkers.options.grouped && listMarkers.options.fnGroupInfoWindow != undefined && listMarkers._infoWindow != undefined) {
                            listMarkers._infoWindow.close();
                        }
                    }

                    marker.infoWindow.open(data.map, marker);
                });
            }

            data.markerLists[listName].addMarker(marker);

            $(this).data("rocksMaps", data);
        },

        hideMarker: function (listName, id) {
            $.rockMaps._executeAgainstMarkers.call(this, listName, id, function (marker) {
                marker.setVisible(false);
            });
        },

        showMarker: function (listName, id) {
            $.rockMaps._executeAgainstMarkers.call(this, listName, id, function (marker) {
                marker.setVisible(true);
            });
        },

        bounceMarker: function (listName, id) {
            $.rockMaps._executeAgainstMarkers.call(this, listName, id, function (marker) {
                if (marker.grouper) {
                    marker.setAnimation(google.maps.Animation.BOUNCE);
                    marker.grouper.removeMarker(marker);
                    marker.setMap(marker.grouper.getMap());
                } else {
                    marker.setAnimation(google.maps.Animation.BOUNCE);
                }
            });
        },

        stopMarker: function (listName, id) {
            $.rockMaps._executeAgainstMarkers.call(this, listName, id, function (marker) {
                marker.setAnimation(false);
                if (marker.grouper) {
                    marker.grouper.addMarker(marker);
                }
            });
        },

        centerMarker: function (listName, id) {
            var data = $(this).data("rocksMaps");

            if (id) {
                $.rockMaps._executeAgainstMarkers.call(this, listName, id, function (marker) {
                    data.map.setCenter(marker.getPosition());
                });
            } else {
                var bounds = data.markerLists[listName].getBounds();
                data.map.fitBounds(bounds);
            }
        },

        resize: function () {
            var data = $(this).data("rocksMaps");
            if (data != undefined) {
                google.maps.event.trigger(data.map, "resize");
            }
        },

        _executeAgainstMarkers: function (listName, id, fn) {
            var data = $(this).data("rocksMaps");

            var markers = data.markerLists[listName].getMarkers();
            var markersToBeHidden = $.grep(markers, function (marker) {
                return id == undefined || marker.id == id;
            });

            $.each(markersToBeHidden, function (i, marker) {
                fn(marker);
            });
        },

        MarkerList: function (map, options) {
            var markerList = {};
            markerList._markers = [];
            markerList._map = map;

            markerList.options = options || {};

            if (markerList.options.grouped) {
                
                if (markerList.options.fnGroupInfoWindow != undefined) {
                    markerList._grouper = new MarkerClusterer(markerList._map, [], { zoomOnClick: false });
                    google.maps.event.addListener(markerList._grouper, 'clusterclick', function(cluster) {
                        var map = cluster.getMap();

                        if (map.getZoom() != 21) {
                            map.fitBounds(cluster.getBounds());
                        } else {
                            var info = new google.maps.MVCObject;
                            info.set('position', cluster.getCenter());

                            markerList._infoWindow = new google.maps.InfoWindow({});
                            var html = markerList.options.fnGroupInfoWindow(cluster.getMarkers());

                            markerList._infoWindow.setContent(html);
                            markerList._infoWindow.open(map, info);
                            
                            if (markerList.options.fnAfterGroupInfoWindow != undefined) {
                                markerList.options.fnAfterGroupInfoWindow();
                            }
                        }
                    });
                } else {
                    markerList._grouper = new MarkerClusterer(markerList._map);
                }
            }

            markerList.addMarker = function (marker) {
                this._markers.push(marker);

                if (markerList.options.grouped) {
                    markerList._grouper.addMarker(marker);
                    marker.grouper = markerList._grouper;
                }
            };

            markerList.getMarkers = function () {
                return this._markers;
            };

            markerList.clear = function () {
                for (var i = 0; i < markerList._markers.length; i++) {
                    markerList._markers[i].setMap(null);
                }

                if (markerList.options.grouped) {
                    markerList._grouper.clearMarkers();
                    
                    if (markerList.options.fnGroupInfoWindow != undefined && markerList._infoWindow != undefined) {
                        markerList._infoWindow.close();
                    }
                }

                markerList._markers.length = 0;
            };

            markerList.getBounds = function () {
                var bounds = new google.maps.LatLngBounds();

                $.each(markerList._markers, function (index, marker) {
                    bounds.extend(marker.getPosition());
                });

                return bounds;
            };

            return markerList;
        }

    });

}(jQuery));