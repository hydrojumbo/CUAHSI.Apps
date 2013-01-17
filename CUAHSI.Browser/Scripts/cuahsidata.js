/*
 * Copyright (c) 2013, Alex Bedig, New BSD License: https://github.com/hydrojumbo/CUAHSI.Apps/blob/master/LICENSE.md
 */

/* CUAHSI Faceted Discovery HTTP API endpoints */
var vis = appDomain + '/Vis/Index';
var FacetsAPI = appDomain + '/api/facets/';
var OntologyAPI = appDomain + '/api/ontologyitems/';
var SearchAPI = appDomain + '/api/seriesmetadata/';
var DataAPI = appDomain + '/api/seriesdata/';
var SitesAPI = appDomain + '/api/sites/';

var appName = 'prototype-cuahsidata'; // controls objectStore used for this application
var appVersion = 6; // controls active database schema

/* non inter-session persisting object store names */
var ontologyitems = 'ontologyitems'; // stores ontologyitems ingested by user by id => enables immediate back-button regeneration
var series = 'series';   // stores seriesmetadata and includes client-side info like date/time last values acquisition attempt from server was made, and acquisition state (failed - with reasons, success)
var sites = 'sites';     // stores sites accessed by users
var history = 'history'; // stores user progression within this session, enabling back button
var myselections = 'myselections'; // DEPRECATED v6 => not fast enough for quick UI operations. stores user's current vocabulary selections within the ui

/* inter-session persisting object store names */
var values = 'values';   // stores downloaded series. Not cleaned out after every page reload, and it is the exclusive data source for the data vis pane, enabling offline functionality.
var datasets = 'datasets'; // stores user's collections of seriesdata. Not cleaned out after every page reload, enabling offline functionality.
var mysettings = 'mysettings'; // stores user's UI preferences. Not cleaned out after every page reload, so users can save their settings between sessions.

function debugConsole(message) {
    if (typeof console != "undefined") {
        console.log(message);
    }
}

// courtesy: https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference:Global_Objects:Date#Example:_ISO_8601_formatted_dates
function ISODateString(d) {
    function pad(n) { return n < 10 ? '0' + n : n }
    return d.getUTCFullYear() + '-'
      + pad(d.getUTCMonth() + 1) + '-'
      + pad(d.getUTCDate())
}

/* helper utility function used for distinct() operations on javascript collections (e.g. distinct facets of ontologyitems/ response) */
Array.prototype.getUnique = function () {
    var u = {}, a = [];
    for (var i = 0, l = this.length; i < l; ++i) {
        if (u.hasOwnProperty(this[i])) {
            continue;
        }
        a.push(this[i]);
        u[this[i]] = 1;
    }
    return a;
}

/* helper function used for removing items of any key from an array */
Array.prototype.remove = function () {
    var what, a = arguments, L = a.length, ax;
    while (L && this.length) {
        what = a[--L];
        while ((ax = this.indexOf(what)) !== -1) {
            this.splice(ax, 1);
        }
    }
    return this;
};

/* central location for data management tasks in the CUAHSIData app */
function InitDb() {
    /* indexeddb jquery use based on https://github.com/axemclion/jquery-indexeddb/blob/master/example/index.html */    
    var key = null;
    /* remember: export my journey: add datetime persistence value to each object, with index, cluster on ranges, produce step-by-step interaction replay */
    var request = $.indexedDB(appName, {
        'version': appVersion,
        'schema': {
            '1': function (trans) {                

                var seriesStore = trans.createObjectStore(series, {
                    'keypath': 'SeriesID',
                    'autoIncrement': false
                });

                var sitesStore = trans.createObjectStore(sites, {
                    'keypath': 'SiteID',
                    'autoIncrement': false
                });
                // sitesStore.createIndex('SiteName'); /* use in autocomplete? */

                var valuesStore = trans.createObjectStore(values, {
                    'keypath': 'myMetadata.SeriesID',
                    'autoIncrement': false
                });
            },
            '2': function (trans) {
                var stateStore = trans.createObjectStore(history, {
                    'keypath': 'Id',
                    'autoIncrement': true
                });                

                var ontologyStore = trans.createObjectStore(ontologyitems, {
                    'keypath': 'Id',
                    'autoIncrement': false
                });

                trans.deleteObjectStore(series);
                var seriesStore = trans.createObjectStore(series, {
                    'keypath': 'SeriesID',
                    'autoIncrement': false
                });                
                seriesStore.createIndex('LastDataRequest'); // tracks last time data values for this series were requested                

                var datasetStore = trans.createObjectStore(datasets, {
                    'keypath': 'Id',
                    'autoIncrement': true
                });
                datasetStore.createIndex('CreationTime');
                datasetStore.createIndex('myTags', 
                    {
                        'unique': true,
                        'multientry': true // all tags for all objects listed in get() of this index, for single-loop search
                    });

                // ontologyStore.createIndex('FacetID');
            },
            '3': function (trans) {
                var settingsStore = trans.createObjectStore(mysettings, {
                    'keypath': 'Id',
                    'autoIncrement': true
                });
                settingsStore.add({
                    'showTooltips': true,
                    'showIntroMovie': true
                });

                var selectionsStore = trans.createObjectStore(myselections, {
                    'keypath': 'Id',
                    'autoIncrement': false
                });
            },
            '4': function (trans) {
                var ontologyStore = trans.objectStore(ontologyitems);
                ontologyStore.createIndex('FacetID');
            },
            '5': function (trans) {
                var theNow = Date.now();
                var valueStore = trans.objectStore(values);
                var iter = valueStore.each(function (item) {
                    var newItem = item;
                    newItem.value.AccessTime = theNow; /* all data accessed before this update considered accessed at moment of update */
                    item.update(newItem);
                });

                iter.done(function (result, event) {
                    valueStore.createIndex('AccessTime');
                });
                
                iter.fail(function (error, event) {
                    debugConsole('failed on insert of datetimes into valuestore objects during upgrade to schema 5. AccessTime index never created.');
                    debugConsole(error);
                    debugConsole(event);
                });

            },
            '6': function (trans) {
                trans.deleteObjectStore(myselections);
            }
        }
    });
    return request;
}




