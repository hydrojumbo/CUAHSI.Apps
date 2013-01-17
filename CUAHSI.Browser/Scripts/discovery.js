/*
 * Copyright (c) 2013, Alex Bedig, New BSD License: https://github.com/hydrojumbo/CUAHSI.Apps/blob/master/LICENSE.md
 */

/* discovery state variables */
var facetMembers = []; // in-memory version
var html, lastPin; // memory locations for the custominfobox to persist state with
var zoomLimit = 7; // most zoomed-out (smallest #) view with auto-search turned on
var lastZoom = 11/* 9 11*/;  // used for figuring out when to query again, and for initializing UI, 7 used for benchmarking
var lastBounds;     // used for figuring out when to query again
var currentData; // last SeriesData object to be returned and displayed as visualization (use for download)
var ontologyxhr;    // jqXHR state for ontology requests
var sitesxhr;       // jqXHR state for site requests
var seriesxhr;      // jqXHR state for seriesmetadata requests
var dataProgress = [];   // SeriesID array for tracking all outstanding data requests                     
var mySelections = {};   // object literal for persisting state of selected items, uses ConceptID as its key

/* discovery map components */
var map;
var myLayer;        // used for clustering pins
var customInfobox;
/*var infoboxOptions = { width: 200, height: 100, showCloseButton: true, zIndex: 0, offset: new Microsoft.Maps.Point(10, 0), showPointer: true };*/

var sessionID;    // guid given to page from server on load for use in session tracking of api calls (this is research, after all)

$(function () {        
    var request = InitDb();
    
    debugConsole(sessionID);
    request.done(function (result, event) {

        // Once the DB is opened with the object stores set up, add a link to the visualize tab if there are any series and do other start-up tasks
        debugConsole('init db');
        RefreshMyDataLinkFromDb();

        /* clear session-specific series, sites, ontology, history tables */
        $.indexedDB(appName).objectStore(ontologyitems, 'readwrite').clear();
        $.indexedDB(appName).objectStore(series, 'readwrite').clear();
        $.indexedDB(appName).objectStore(sites, 'readwrite').clear();
        $.indexedDB(appName).objectStore(history, 'readwrite').clear();        

        $('#startdate').datepicker({
            dateFormat: 'yy-mm-dd',
            onSelect: function(dateText, inst) {
                var params = getSearchCriteria();
                var Selections = [];

                $.each(mySelections, function (i, item) {
                    Selections.push(item.Id + '-' + item.FacetID);
                });

                if (Selections.length > 0) {
                    params.Selections = Selections.join(',');
                    ExecuteFacetedSearch('counts', params, mySelections); // if anything specified, load ontology and sites views
                } else {
                    ExecuteFacetedSearch('basic', params, mySelections);  // if nothing specified, just load ontology
                }
            }
        }).val('2000-01-01'); // iso 8601

        $('#enddate').datepicker({
            dateFormat: 'yy-mm-dd',
            onSelect: function(dateText, inst) {
            var params = getSearchCriteria();
            var Selections = [];

            $.each(mySelections, function (i, item) {
                Selections.push(item.Id + '-' + item.FacetID);
            });

            if (Selections.length > 0) {
                params.Selections = Selections.join(',');
                ExecuteFacetedSearch('counts', params, mySelections); // if anything specified, load ontology and sites views
            } else {
                ExecuteFacetedSearch('basic', params, mySelections);  // if nothing specified, just load ontology
            }
        }
        }).val(ISODateString(new Date));   // iso 8601                        

        debugConsole('datepicker init');

        $('#searchBtn').button().click(function (event) {
            var params = getSearchCriteria();
            var Selections = [];
            
            $.each(mySelections, function(i, item) {
                Selections.push(item.Id + '-' + item.FacetID);
            });

            if (Selections.length > 0) {
                params.Selections = Selections.join(',');
                ExecuteFacetedSearch('counts', params, mySelections); // if anything specified, load ontology and sites views
            } else {
                ExecuteFacetedSearch('basic', params, mySelections);  // if nothing specified, just load ontology
            }                       
        });

        debugConsole('searchBtn init');
        
        GetMap();

        debugConsole('map init');
    });

    request.fail(function (error, event) {

        alert('Your device does not support all features needed to use this site. Please try visiting us on a current browser, such as Google Chrome.');
    });
});

/* puts api/sites/ result object into map pin */
function searchItemToUI(item) {
    var newTitle = item.SiteName + ', ' + item.OrganizationName;
    var pin = new Microsoft.Maps.Pushpin(new Microsoft.Maps.Location(item.Lat, item.Lng), { /* text: newTitle */ });

    // (http://msdn.microsoft.com/en-us/library/gg675208.aspx)				

    // var newcontent = '<div class="cuahsiinfobox" id="Site-' + item.SiteID + '"><br /><b>' + newTitle + '</b><p id="SeriesCountStat">Series Count: ' + item.SeriesCount + '</p><p id ="ValueCountStat">Value Count: ' + item.ValueCount + '</p>' + controlHTML('GetSeries', item.SiteID + '_' + item.Lat + '_' + item.Lng, 'View Series') + '</div>';
    var newcontent = '<div class="cuahsiinfobox" id="Site-' + item.SiteID + '"><br /><b>' + newTitle + '</b></div>';
    var pinInfobox = new Microsoft.Maps.Infobox(pin.getLocation(), { visible: false });
    pinInfobox.setHtmlContent(newcontent);
    
    pin.description = item.SiteID + '_' + item.Lat + '_' + item.Lng + '||' + newcontent;    

    // Hide the infobox when the map is moved.
    Microsoft.Maps.Events.addHandler(map, 'viewchange', function (e) {
        this.setOptions({ visible: false });
    }.bind(pinInfobox));
    
    Microsoft.Maps.Events.addHandler(pin, 'click', displayInfobox);

    // Add the pushpin and info box to the map
    map.entities.push(pin);
    // resultsMap.entities.push(pinInfobox);				
}

/* builds the html of an accordion option in the UI, given a list of ontology items of the same facet */
function createAccordionItem(item, params, verbosity) {
    /* create exterior of accordion group */
    var facetLink = 'facet' + item[0].FacetID;
    var facetLinkList = facetLink + 'List';
    var html = '<div class="accordion-group">';
    html += '<div class="accordion-heading">';
    html += '<a class="accordion-toggle" data-toggle="collapse" data-parent="#ontologyNav" href="#' + facetLink + '">' + item[0].FacetName + ' (' + item.length + ' options)' + '</a></div>';
    html += '<div id="' + facetLink + '" class="accordion-body collapse"><div class="accordion-inner">';
    html += '<ul id="' + facetLinkList + '" class="ontologyList">';
    /* populate ontologyitems in accordion group */
    for (var j = 0; j < item.length; j++) {
        var ontologySign = item[j].Id + '-' + item[j].FacetID;
        var newID = 'concept_' + ontologySign;
        if (params.Selections != null) {
            var idx = params.Selections.indexOf(ontologySign);
        }
        else {
            var idx = -1;
        }

        if (verbosity == 'counts') {
            if (idx < 0) { // not in Selections, create unchecked
                html += '<li><input id="' + newID + '" type="checkbox" class="ontologyItem"><label for="' + newID + '">' + item[j].ConceptName + '<br /><small> Series: ' + item[j].SeriesCount + '<br /> Total Observations: ' + item[j].ValueCount + '</small></label></li>';
            }
            else {         // selected by user for this lookup, create checked
                html += '<li><input id="' + newID + '" type="checkbox" checked="checked" class="ontologyItem"><label for="' + newID + '">' + item[j].ConceptName + '<br /><small> Series: ' + item[j].SeriesCount + '<br /> Total Observations: ' + item[j].ValueCount + '</small></label></li>';
            }
        }
        else {
            if (idx < 0) { // not in Selections, create unchecked
                html += '<li><input id="' + newID + '" type="checkbox" class="ontologyItem"><label for="' + newID + '">' + item[j].ConceptName + '</label></li>';
            }
            else {         // selected by user for this lookup, create checked
                html += '<li><input id="' + newID + '" type="checkbox" checked="checked" class="ontologyItem"><label for="' + newID + '">' + item[j].ConceptName + '</label></li>';
            }
        }
    }

    /* close accordion group */
    html += '</ul></div></div></div>';

    /* inject html into page */
    $('#ontologyNav').append(html);    
}

// builds a button formatted for the discovery interface's slideshow. Bind to this with $(".className").click(function () {.
function controlHTML(className, id, text) {
    return '<button class="' + className + '" id="' + id + '">' + text + '</button>';
}

function displayInfobox(e) {
    /*lastPin = e.target;
    html = [e.target.description];
    customInfobox.show(lastPin.getLocation(), html.join(''));
    bindGetSeriesLogic();*/    
    var metadata = e.target.description.split('||');
    html = [metadata[1]];
    customInfobox.show(e.target.getLocation(), html.join(''));
    
    var dat = metadata[0].split('_');    
    GetSeriesLogic(dat[0], dat[1], dat[2]);
}

/* returns the ontology and time boundaries => location specified by Site */
function getSiteSearchCriteria() {
    var data = {};
    data.BeginTime = $('#startdate').val();
    data.EndTime = $('#enddate').val();
    return data;
    // return addOntologySelectionsToData(data);
}

// returns boundaries of current map window in wgs84, and date/time boundaries
// includes DiscoveryWizardType
// initializes Skips => set in event method based on local variable
// selectSlide = 0 if the user acted on the first non space/time slide, -1 if was one of the space/time slides
function getSearchCriteria() {
    
    var data = {};
    var bounds = map.getBounds();
    lastBounds = bounds;
    data.SouthLat = bounds.getSouth();
    data.NorthLat = bounds.getNorth();
    data.WestLng = bounds.getWest();
    data.EastLng = bounds.getEast();

    var bt = $('#startdate').val();
    var et = $('#enddate').val();

    data.BeginTime = bt;
    data.EndTime = et;

    /* if there are any ontologyitems on the page, transfer their selections */
    // data = addOntologySelectionsToData(data);

    // debugConsole(Selections);
    debugConsole(data);
    return data;
}

// updates the Selections object tracking currently tracked ontology items on interaction with ontology items
// oItem = item[j].Id + '-' + item[j].FacetID + '-' + item[j].ConceptName
function updateSelectionsFromSender(chkbx) {
    var oItem = $(chkbx).attr('id').split('_')[1];        
    var Oid = parseInt(oItem.split('-')[0]);    
    debugConsole(chkbx.checked);
    if (chkbx.checked)
    {
        var ontologyStore = $.indexedDB(appName).objectStore(ontologyitems, 'readonly');
        var promise = ontologyStore.get(Oid);
        promise.done(function (result, event) {
            if (result === undefined) {
                debugConsole('CRITICAL ERROR: unable to retrieve selected ontology item from db. Unknown app state - page refresh recommended.');
            } else {
                mySelections[oItem] = result;
                debugConsole('selected concept ' + Oid);
                updateSelectionSummary(mySelections, false);
            }            
        });

        promise.fail(function (error, event) {
            debugConsole('error selecting concept ' + Oid);
            debugConsole(error);
            debugConsole(event);
        });        
    }
    else
    {
        delete mySelections[oItem];
        updateSelectionSummary(mySelections, false);
    }
    /*if ($(chkbx).is(':checked')) {
        
    }
    else {
        
    }*/
    /*var dataStore = $.indexedDB(appName).objectStore(myselections, 'readonly');
    var Oid = parseInt(oItem.split('-')[0]);
    var promise = dataStore.get(Oid);
    promise.done(function (result, event) {
        if ($(chkbx).is(':checked')) {
            if (result === undefined) { // not there yet, so add it from onntologyitems
                // Selections.push(oItem.split('-')[1]); // conceptid-facetid                
                /*var ostore = $.indexedDB(appName).objectStore(ontologyitems, 'readonly');

                var ontologyitem = ostore.get(Oid);
                ontologyitem.done(function (result, event) {
                    if (result === undefined) { debugConsole('CRITICAL ERROR: unable to retrieve selected ontology item from db. Unknown app state - page refresh recommended.'); }
                    else {
                        debugConsole(result);
                        var addprom = $.indexedDB(appName).objectStore(myselections, 'readwrite').add(result, Oid);
                        addprom.fail(function (error, event) {
                            debugConsole('myselections fail');
                            debugConsole(error);
                        });

                        addprom.done(function (r, e) {
                            var selectionlist = new Array();
                            debugConsole('reading myselections to generate selectionlist');
                            var prom = $.indexedDB(appName).objectStore(myselections, 'readonly').each(function (item) {
                                debugConsole(item);
                                selectionlist.push(item.value);
                            })
                            prom.done(function (rr, ee) {
                                updateSelectionSummary(selectionlist, false);
                            })
                            prom.fail(function (err, eve) {
                                debugConsole('error reading myselections');
                                debugConsole(err);
                            });
                        });
                    }
                });
            }
        }
        else {
            if (result !== undefined) { // already there and unchecked, so remove it
                // Selections.slice(i, 1);
                $.indexedDB(appName).objectStore(myselections, 'readwrite').delete(Oid).done(function (r, e) {
                    var selectionlist = new Array();
                    var selprom = $.indexedDB(appName).objectStore(myselections, 'readonly').each(function (item) {
                        selectionlist.push(item.value);
                    })
                        
                    selprom.done(function (rr, ee) {
                        updateSelectionSummary(selectionlist, false);
                    });
                    selprom.fail(function (err, eve) {
                        debugConsole('error reading myselections');
                        debugConsole(err);
                    });
                });
            }
        }
    });
    promise.fail(function (error, event) {
        debugConsole("db lookup for updateSelectionsFromSender failed, with error: ");
        debugConsole(error);
    });*/
}

/* generate english-language html element summarizing current set of user selections and replace the existing summary objects with it */
function updateSelectionSummary(selectionItems, justArrived) {
    debugConsole(selectionItems);
    var selLen = $.isEmptyObject(selectionItems); // http://stackoverflow.com/questions/2402193/javascript-associative-array-length-using-jquery    
    var msg = new String();
    if (selLen == true) {
        msg += '<div id="selectionSummary"><br/>Select at least one option from the lists above and click Search to view sites of matching data on the map. Pan or zoom the map to find sites matching your choices in other areas.</div>';
    } else {
        var msg = '<div id="selectionSummary"><br/>';
        if (justArrived === true) {            
            msg += 'Showing sites of data where '
        }
        else {
            msg += 'Click search to show sites of data where ';
        }
        
        var facets = [];
        var facetMembers = {};

        $.each(selectionItems, function (item) {
            if (justArrived === true) {
                if (item === undefined) {

                } else {
                    debugConsole(item);
                    var index = facets.push(item.split('-')[1]);                    
                }                
            } else {
                var index = facets.push(item.split('-')[1]);
            }            
        });

        facets = facets.getUnique();        
        $.each(facets, function (index, item) {
            debugConsole(item);
            facetMembers[item] = new Array();
        });

        $.each(selectionItems, function (index, item) {            
            facetMembers[item.FacetID].push(item); /* FIGURE OUT ERROR HERE FOR JUSTARRIVED === TRUE */
        });

        debugConsole('summarize selections');
        /* summarize the current selections */
        var count = 0;
        for (var i = 0; i < facets.length; i++) {
            var item = facetMembers[facets[i]];
            if (count > 0) {
                msg += ', and ' + item[0].FacetName + ' equals ';
            } else {
                msg += item[0].FacetName + ' equals ';
            }
            count++;
            
            var tagList = [];            
            $.each(item, function (index, sel) {
                tagList.push('<a class="selectionTag" id="tag-' + item[0].Id + '-' + item[0].FacetID + '">' + sel.ConceptName + '</a>');
            });
            msg += tagList.join(', or ');
        }   

        msg += ' on the map.</div>';        
    }

    debugConsole(msg);

    /* now update the ui with this message */
    $('#selectionSummary').remove();
    $(msg).insertAfter('#searchBtn');    

    $('.selectionTag').bind('click', function () {
        // set up event to re-calculate selectionSummary html when user removes it.        
        var doneTag = this.id.replace('tag-', '');
        debugConsole(doneTag);
        $('#concept_' + doneTag).attr('checked', false);
        delete mySelections[doneTag]; // remove the selection from the list
        debugConsole(mySelections);
        updateSelectionSummary(mySelections, false);        
    });
}

function ExecuteFacetedSearch(verbosity, params, selectionItems) {
    debugConsole('ExecuteFacetedSearch verbosity: ' + verbosity);
    debugConsole(params);   

    var searchTimestamp = Date.now();

    if (ontologyxhr != null) { /* cancel handling pending ontology searches => look into deleting values from myhistory objectstores too */
        debugConsole(ontologyxhr);
        ontologyxhr.abort();
        $('.loadingOptions').remove();
    }

    if (sitesxhr != null) { /* cancel handling pending sites searches => look into deleting values from myhistory objectstores too */
        debugConsole(sitesxhr)
        sitesxhr.abort();
        $('.loadingSites').remove();
    }

    if (verbosity == 'counts') {               

        var siteParams = params;
        params.verbosity = 'counts';
        $('#ontologyNav').append(LoadingSitesImg());
        sitesxhr = $.ajax({
            type: 'GET',
            url: SitesAPI,
            dataType: 'json',            
            data: siteParams,
            beforeSend: function(xhr) {
                xhr.setRequestHeader('Research-Key', sessionID);
            },                        
            success: function (data, textStatus) {
                map.entities.clear();                                
                storeSites(data);
                debugConsole('sites stored');
                $.each(data, function (i, item) {
                    searchItemToUI(item);
                });

                $('.loadingSites').remove();
            },
            error: function (xhr, textStatus, errorThrown) {
                if (textStatus == 'abort') {
                    /* do nothing */
                }
                else if (textStatus == 'timeout') {
                    alert('Your request timed out. This may be due to high volume server load, solution migration (this is a prototype!), or the size of your request relative to the current infrastructure allocation. Please try again later, and/or try again with a smaller search region');
                }
                else {
                    alert('Error getting sites with status ' + textStatus + ' and message ' + errorThrown + '. If this problem persists, and you are not using Google Chrome (this is prototype software and is only tested on that platform), please contact Alex Bedig at alex (dot) bedig (at) tufts (dot) edu');
                }
                $('.loadingSites').remove();
            }
        });
    }

    $('.accordion-group').remove();
    $('#ontologyNav').append(LoadingImg());
    ontologyxhr = $.ajax({
        url: OntologyAPI,
        dataType: 'json',        
        data: params,
        type: 'GET',

        beforeSend: function (xhr) {
            xhr.setRequestHeader('Research-Key', sessionID);
        },        
        success: function (data, textStatus) {
            $('.loadingOptions').remove();
            var facets = [];
            facetMembers = [];
            var facetCount = 0;
            storeOntologyItems(data); // persist to indexeddb
            $.each(data, function (i, item) {
                var index = facets.push(item.FacetID);
            });            

            facets = facets.getUnique();

            $.each(facets, function (i, item) {
                facetMembers[item] = new Array();
            });
            
            for (var d = 0; d < data.length; d++) {
                facetMembers[data[d].FacetID].push(data[d]);
            }

            debugConsole('facet data structure populated, rebuilding ontology ui with params: ');

            $.each(facetMembers, function (i, item) {
                if (item) {
                    createAccordionItem(item, params, verbosity);
                }
            });

            /* wire up click events to AccordionItems just created */
            $('.ontologyItem').click(function (event) {                
                updateSelectionsFromSender(event.target);
            });

            /* display english selection summary */
            updateSelectionSummary(mySelections, true);                                                         
        },
        error: function (xhr, textStatus, errorThrown) {
            if (textStatus == 'abort') {
                /* do nothing */
            }
            else if (textStatus == 'timeout') {
                alert('Your request timed out. This may be due to high volume server load, solution migration (this is a prototype!), or the size of your request relative to the current infrastructure allocation. Please try again later, and/or try again with a smaller search region');
            }
            else {
                alert('Error getting ontology items with status ' + textStatus + ' and message ' + errorThrown + '. If this problem persists, please contact Alex Bedig at alex (dot) bedig (at) tufts (dot) edu');
            }
        }
    });
}

// Successful geolocation
function locateSuccess(loc) {
    // Set the user's location
    debugConsole(loc);
    var userLocation = new Microsoft.Maps.Location(loc.position.coords.latitude, loc.position.coords.longitude);
    // Zoom in on user's location on map
    map.setView({ center: userLocation, zoom: lastZoom });
    debugConsole('set location ');

}

function LoadingImg() {
    return '<h4 class="loadingOptions">Loading options</h4><img class="loadingOptions" src="/Images/load.gif">';
}

function LoadingSitesImg() {
    return '<h4 class="loadingSites">Loading sites to map</h4><img class="loadingSites" src="/Images/load.gif">';
}

function LoadingSeriesImg(SiteID) {
    return '<img id="' + LoadingSeriesOfSiteName(SiteID) + '" class="loadingSeries" src="/Images/load.gif">';
}

function LoadingSeriesOfSiteName(SiteID) {
    return 'loadingSeriesOfSite-' + SiteID;
}

function DownloadingDataSpinner(SeriesID) {
    return '<img id="' + DownloadingSeriesImageID(SeriesID) + '" class="DownloadingSeries" src="/Images/load.gif">';
}

function DownloadingSeriesImageID(SeriesID) {
    return 'downloadingseries-' + SeriesID;
}

/*  Code from http://msdn.microsoft.com/en-us/library/gg508987.aspx */
function displayEventInfo(e) {
    if (e.targetType == "pushpin") {
        var pix = map.tryLocationToPixel(e.target.getLocation(), Microsoft.Maps.PixelReference.control);
        var infoboxTitle = document.getElementById('infoboxTitle');
        infoboxTitle.innerHTML = e.target.title;
        var infoboxDescription = document.getElementById('infoboxDescription');
        infoboxDescription.innerHTML = e.target.description;
        var infobox = document.getElementById('infoBox');
        infobox.style.top = (pix.y - 60) + "px";
        infobox.style.left = (pix.x + 5) + "px";
        infobox.style.visibility = "visible";
        document.getElementById('mapDiv').appendChild(infobox);
    }
}

function closeInfoBox() {
    var infobox = document.getElementById('infoBox');
    infobox.style.visibility = "hidden";
}

function GetMap() {
    map = new Microsoft.Maps.Map(
        document.getElementById('mapDiv'), {
            credentials: 'AvF4rVTQSrSPJt1eCjHPMWNndhw_4HechzaNWrfDn3llX9bIR1wPbw0iXz_aWPMl',
            disableKeyboardInput: true,
        }
    );

    //Define custom properties for the pushpin class (this is needed for the infobox and not the clustering) 
    Microsoft.Maps.Pushpin.prototype.title = null;
    Microsoft.Maps.Pushpin.prototype.description = null;

    /*myLayer = new ClusteredEntityCollection(map, {
        singlePinCallback: createPin,
        clusteredPinCallback: createClusteredPin
    })*/;

    Microsoft.Maps.Events.addHandler(map, 'viewchangeend', function (e) {
        var nowZoom = map.getZoom();
        var nowBounds = map.getBounds();
        debugConsole('nowBounds: ' + nowBounds + '; prevBounds: ' + lastBounds);
        debugConsole('nowZoom: ' + nowZoom + '; prevZoom: ' + lastZoom);

        var search = false;

        /* search if bounds are outside last ones, either due to zooming or panning */
        if (nowZoom < zoomLimit) { /* disable panning until you get better at this */
            search = false;
        } else {
            if (lastBounds != null) {
                if (nowBounds.getNorth() > lastBounds.getNorth() ||
                    nowBounds.getSouth() < lastBounds.getSouth()) /* cheat: just check top and bottom, assume user will never pan horizontally */ {
                    search = true;
                }
            } else {
                search = true;
            }
        }

        /* execute search with items from selections objectstore */
        if (search === true) {
            var params = getSearchCriteria();                       
                searchSel = [];
                $.each(mySelections, function (i, item) {
                    searchSel.push(item.Id + '-' + item.FacetID);
                });

            if (searchSel.length > 0) {                
                params.Selections = searchSel.join(',');
                debugConsole(params);
                ExecuteFacetedSearch('counts', params, mySelections); // if anything specified, load ontology and sites views
            } else {
                ExecuteFacetedSearch('basic', params, mySelections);  // if nothing specified, just load ontology
            }                                  
        }
    });

    // Initialize the location provider
    var geoLocationProvider = new Microsoft.Maps.GeoLocationProvider(map);

    // Get the user's current location
    geoLocationProvider.getCurrentPosition({ updateMapView: false, successCallback: locateSuccess });

    /* initialize infobox module for popup */
    Microsoft.Maps.registerModule("CustomInfoboxModule", "Scripts/V7CustomInfobox.min.js");
    Microsoft.Maps.loadModule("CustomInfoboxModule", {
        callback: function () {
            customInfobox = new CustomInfobox(map);
        }
    });
}

/* basis of clustered mapping */
function createPin(data) {
    var pin = new Microsoft.Maps.Pushpin(data._LatLong);

    pin.title = "Single Location";
    pin.description = "GridKey: " + data.GridKey;

    //Add handler for the pushpin click event.
    Microsoft.Maps.Events.addHandler(pin, 'click', displayEventInfo);

    return pin;
}

/* generates higher-level clustered pins */
function createClusteredPin(cluster, latlong) {
    var pin = new Microsoft.Maps.Pushpin(latlong, { text: '+' });

    pin.title = "Cluster";
    pin.description = "GridKey: " + cluster[0].GridKey + "<br />Cluster Size: " + cluster.length + "<br />Zoom in for more details.";

    //Add handler for the pushpin click event.
    Microsoft.Maps.Events.addHandler(pin, 'click', displayEventInfo);

    return pin;
}

/* hooks up logic to manage seriesdata/ complete:
    1) persist data
    2) provide links*/
function DownloadDataValues(SeriesID, Lat, Lng, callbackDataCell) {
    debugConsole('DownloadDataValues clicked with id ' + SeriesID);
    var searchData = {};
    searchData.SeriesID = SeriesID;
    searchData.Lat = Lat;
    searchData.Lng = Lng;
    debugConsole(searchData);
                // mixpanel.track('getDataValues', searchData);    
    dataProgress[SeriesID] = 1;
    $.ajax({
        url: DataAPI,
        type: 'GET',
        dataType: 'json',
        data: searchData,
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Research-Key', sessionID);
        },
        success: function (jsondata, textStatus) {
            if (textStatus == 'success') {
                debugConsole(jsondata);
                storeDataValues(jsondata, callbackDataCell, SeriesID);
                dataProgress[SeriesID] = 0;                
            }
            else {
                debugConsole('complete event fired but textStatus == ' + textStatus);
                $('#' + DownloadingSeriesImageID(SeriesID)).remove();
                callbackDataCell.css('background-color', 'red');

                $('#dl-' + SeriesID).tooltip({ html: true, title: 'An error occurred, and a log has been made. Please try again in a few days' });
                // $('#' + callbackDataCell.Id).tooltip('An error occurred, and a log has been made. Please try again in a few days.');
                // $(callbackDataCell).tooltip('An error occurred, and a log has been made. Please try again in a few days.');
            }
        },
        error: function (xhr, textStatus, errorThrown) {         
            searchData.textStatus = textStatus;
            $('#' + DownloadingSeriesImageID(SeriesID)).remove();
            callbackDataCell.css('background-color', 'red');
            $(callbackDataCell).tooltip('An error occurred, and a log has been made. Please try again in a few days.');
            dataProgress[SeriesID] = 0;
            debugConsole(searchData);
            // mixpanel.track('getDataValuesError', searchData);
        }
    });
}

function GetSeriesLogic(siteid, lat, lng) {    
    var searchData = getSiteSearchCriteria();        
    searchData.SiteID = siteid;
    searchData.Lat = lat;
    searchData.Lng = lng;
    debugConsole(searchData);
    $('#Site-' + searchData.SiteID).append(LoadingSeriesImg(searchData.SiteID));
    // mixpanel.track('getDataValues', searchData);    

    /* get selections array from myselections objectStore - LEAVE THIS OUT IF YOU WANT SITE-CLICK TO SHOW ALL SERIES AT THAT SITE */    
    var selectionIDs = [];
    
    $.each(mySelections, function (i, item) {        
        selectionIDs.push(item.Id + '-' + item.FacetID);
    });
    if (selectionIDs.length > 0) {
        searchData.Selections = selectionIDs.join(',');            
    }

    /* execute series search with selections data from indexeddb datastore */
    seriesxhr = $.ajax({
        url: SearchAPI,
        type: 'GET',
        dataType: 'json',
        data: searchData,
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Research-Key', sessionID);
        },
        success: function (jsondata, textStatus) {
            if (textStatus == 'success') {
                debugConsole(jsondata);
                storeSeries(jsondata);

                if (jsondata.length > 0) {
                    var gridID = '#DataTable-' + searchData.SiteID;
                    debugConsole(getSiteSeriesDataTableHTML(searchData.SiteID));
                    $('.GetSeries').remove();
                    $('#' + LoadingSeriesOfSiteName(searchData.SiteID)).remove();

                    $('#SeriesCountStat').remove();
                    $('#ValueCountStat').remove();
                    debugConsole('removed btn');
                    $('#Site-' + searchData.SiteID).append(getSiteSeriesDataTableHTML(searchData.SiteID));
                    debugConsole('appended tbl html');
                    $(gridID).jqGrid({
                        datatype: "local",
                        height: 250,
                        colNames: ['Variable Name', 'Value Count', 'Start Date', 'End Date'],
                        colModel: [
                                { name: 'VariableName', index: 'VariableName' },
                                { name: 'ValueCount', index: 'ValueCount' },
                                { name: 'StartDate', index: 'StartDate' },
                                { name: 'EndDate', index: 'EndDate' }
                                // { name: 'ServURL', index: 'ServURL', width: 80, sortable: false },
                        ],
                        rowNum: 10,
                        // pager: '#prowed-' + searchData.SiteID,
                        // sortname: 'VariableName',
                        // caption: "Available Series (click to download)"
                    }); // .navGrid('#prowed-' + searchData.SiteID, {edit:false, add:false, del: false});                                        

                    debugConsole('loaded datatable of series at site');

                    for (var i = 0; i < jsondata.length; i++) {
                        LoadSiteRow(jsondata[i], i, gridID);
                    }
                }
            }
            else {
                debugConsole('complete event fired but textStatus == ' + textStatus);
            }
        },
        error: function (xhr, textStatus, errorThrown) {
            searchData.textStatus = textStatus;
            $(this.parentNode).css('background-color', 'red');
            debugConsole(searchData);
            $('#' + LoadingSeriesOfSiteName(searchData.SiteID)).remove();
            // mixpanel.track('getDataValuesError', searchData);
        }
        
    });        
}

/* html template for displaying series at a site */
function getSiteSeriesDataTableHTML(SiteID) {
    /* jquery.dataTable attempt return '<div><table cellpadding="0" cellspacing="0" border="0" class="display" id="DataTable-' + SiteID + '"><thead><tr><th>SeriesID</th><th>SiteID</th><th>SiteName</th><th>VariableName</th><th>ValueCount</th><th>StartDate</th><th>EndDate</th><th>ServURL</th><th>VarCode</th><th>SiteCode</th><th>ServCode</th><th>Latitude</th><th>Longitude</th></tr></thead><tbody></tbody></table></div>'*/
    return '<table id="DataTable-' + SiteID + '"></table><div id="prowed-' + SiteID + '"></div>';
}

// suboptimal means of keeping the map div sized correctly, see: https://groups.google.com/forum/?fromgroups=#!topic/timemap-development/4oHgy04bFMY
function resizeMap() {
    // map.map.resizeTo($('#mapDiv').width(), $('#mapDiv').height());                

    // debugConsole('height: ' + $('#mapDiv').height() + ', width: ' + $('#mapDiv').width());
    // map.setOptions({ height: $('#mapDiv').height(), width: $('#mapDiv').width() });
    // debugConsole('map resized');
}

/* appends HTML to listview */
function RefreshMyDataLink(seriesCount) {
    $('#mydatalink').remove();
    $('#nav').append('<li id="mydatalink"><a href="Vis/Index/" target="_blank">My Data (' + seriesCount + ')</a></li>');
    $('#mydatalink').tooltip({ placement: 'bottom', title: 'Visualize and export time series you have already downloaded.' }); /* should work offline <- test first */
    $('#hisreference').tooltip({ placement: 'bottom', title: 'Learn more about the community effort to publish and share hydrologic data.'});
    $('#apireference').tooltip({ placement: 'bottom', title: 'This web site is powered by an HTTP REST API that is easy to integrate into your own applications and scripts (alpha - interfaces subject to change).'});
}

/* Adds and removes the My Data Link */
function RefreshMyDataLinkFromDb() {
    var valStore = $.indexedDB(appName).objectStore(values);
    var countPromise = valStore.count();
    countPromise.done(function (result, event) {
        RefreshMyDataLink(result);
    });
    countPromise.fail(function (error, event) {
        debugConsole("db lookup for values failed, with error: ");
        debugConsole(error);
    });
}

/* write-once to sites objectstore */
function storeSites(data) {
    if (data.length > 0) {
        var siteStore = $.indexedDB(appName).objectStore(sites, 'readwrite');
        $.each(data, function (i, item) {
            var addstate = siteStore.add(item, item.SiteID);
            addstate.fail(function (error, event) {
                if (error.name == 'ConstraintError') {
                    /* do nothing => only need one current copy, and this data is deleted on each refresh of page */
                } else {
                    debugConsole('error adding site to siteStore');
                    debugConsole(item);
                    debugConsole(event);
                    debugConsole(error);
                }
            });
        });
    }    
}

/* write-once to ontologyitem objectstore */
function storeOntologyItems(data) {
    if (data.length > 0) {
        var ontologyStore = $.indexedDB(appName).objectStore(ontologyitems, 'readwrite');
        $.each(data, function (i, item) {
            var addstate = ontologyStore.add(item, item.Id);
            addstate.fail(function (error, event) {
                if (error.name == 'ConstraintError') {
                    /* do nothing => only need one current copy, and this data is deleted on each refresh of page */
                } else {
                    debugConsole('error adding site to ontologyStore');
                    debugConsole(item);
                    debugConsole(event);
                    debugConsole(error);
                }
            });
        });
    }
}

/* write-once to series objectstore */
function storeSeries(data) {
    debugConsole('in store series');    
    if (data.length > 0) {        
        var seriesStore = $.indexedDB(appName).objectStore(series, 'readwrite');
        debugConsole('got seriesStore objectContext');
        $.each(data, function (i, item) {
            var addstate = seriesStore.add(item, item.SeriesID);            
            addstate.fail(function (error, event) {
                if (error.name == 'ConstraintError') {
                    /* consider updating */
                } else {
                    debugConsole('error adding site to seriesStore');
                    debugConsole(item);
                    debugConsole(event);
                    debugConsole(error);
                }
            });
        });
    }
    else { debugConsole(data); }
}

/* checks local storage to see if the user has already downloaded this series */
/* should add mechanism for keeping track of in-process downloads as well */
function LoadSiteRow(jsondata, i, gridID) {
    var seriesGUID = 'SeriesDownload_' + jsondata.SeriesID + '_' + jsondata.Latitude + '_' + jsondata.Longitude;
    var row = {
        VariableName: '<a href="#" title="' + jsondata.VariableName + '" class="downloadbtn" id="dl-' + jsondata.SeriesID + '">' + jsondata.VariableName + '</a>',
        ValueCount: jsondata.ValueCount,
        StartDate: jsondata.StartDate,
        EndDate: jsondata.EndDate
    };
    $(gridID).jqGrid('addRowData', i + 1, row);

    var dataStore = $.indexedDB(appName).objectStore(values, 'readonly');    
    var promise = dataStore.get(jsondata.SeriesID);
    
    promise.done(function (result, event) {                
        if (result === undefined) {
            // return 'none';
        } else {
            // return 'green'; /* TO-DO: modify to track progress status by storing additional data (date aquired/attempted, success) */
            $(gridID).setCell(i + 1, 'VariableName', '', { background: '#66CD00', title: 'You last downloaded this series on ' + result.AccessTime + '. Click the link to refresh your local copy.' });
        }        
    });
    promise.fail(function (error, event) {
        debugConsole('LoadSiteRow error event for series: ' + jsondata.SeriesID);
        debugConsole(error);
        debugConsole(event);
        return 'error';
    });

    $('#dl-' + jsondata.SeriesID).on('click', function (event) {
        debugConsole($(this.parentNode));
        $(this.parentNode).css('background-color', 'yellow');
        $(this.parentNode).append(DownloadingDataSpinner(jsondata.SeriesID));
        DownloadDataValues(jsondata.SeriesID, jsondata.Latitude, jsondata.Longitude, $(this.parentNode));
    });
}

/* write-once to values objectstore => update to handle refresh */
function storeDataValues(data, callbackDataCell, SeriesID) {    
    var dataStore = $.indexedDB(appName).objectStore(values, 'readwrite');
    data.AccessTime = Date.now();
    var addstate = dataStore.add(data, data.myMetadata.SeriesID);
    addstate.fail(function (error, event) {
        if (error.name == 'ConstraintError') {
            /* consider updating */
        } else {
            debugConsole('error adding series to valueStore');
            $('#' + DownloadingSeriesImageID(SeriesID)).remove();
            callbackDataCell.css('background-color', 'red');
            $(callbackDataCell).tooltip('An error occurred, and a log has been made. Please try again in a few days.');
            debugConsole(data);
            debugConsole(event);
            debugConsole(error);
        }
    });
    addstate.done(function (result, event) {
        RefreshMyDataLinkFromDb();
        $('#' + DownloadingSeriesImageID(SeriesID)).remove();
        callbackDataCell.css('background-color', 'green');
        debugConsole('background-color: green');
        debugConsole(callbackDataCell.context);
        debugConsole('#dl-' + SeriesID);
        $('#dl-' + SeriesID).tooltip({ html: true, title: '<html><div class="downloadStatus"><p>Download complete. Click My Data on the top right to visualize data.</p></div></html>' });
    });
}