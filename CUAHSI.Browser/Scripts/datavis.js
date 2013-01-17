/*
 * Copyright (c) 2013, Alex Bedig, New BSD License: https://github.com/hydrojumbo/CUAHSI.Apps/blob/master/LICENSE.md
 */

var flotTitle = "";
var flotAxes;

$(function () {
    /* initialize local variables for tracking axis state */
    flotAxes = new Object();
    flotAxes['y1'] = new Object();
    flotAxes['y2'] = new Object();
    flotAxes['y1'].VariableName = "";
    flotAxes['y1'].data = new Object();

    flotAxes['y2'].VariableName = "";
    flotAxes['y2'].data = new Object();

    /* initalize UI controls for filtering via date/time */
    $('#vis-startdate').datepicker({ dateFormat: 'yy-mm-dd' }).val('2000-01-01'); // iso 8601
    $('#vis-enddate').datepicker({ dateFormat: 'yy-mm-dd' }).val(ISODateString(new Date));   // iso 8601 

    // UNCOMMENT HERE TO CLEAR LOCAL DB ON LOAD (TESTING ONLY)
    /*
    var dataStore = $.indexedDB(appName).objectStore(values, 'readwrite');
    var iterationPromise = dataStore.each(function (item) {
        item.delete();
        return;
    });*/
    LoadSeriesToDataTable();

    
});  

/* uses the time values in the header to determine which series should be an option for visualization, populates the data table */
function LoadSeriesToDataTable() {
    debugConsole('LoadSeriesToDataTable called');
    $('#SeriesGrid').jqGrid({
        datatype: "local",
        colNames: ['Series ID', 'Site Name', 'Variable Name', 'Value Count'],// , 'Observations'],
        colModel: [
                { name: 'SeriesID', hidden: true, index: 'SeriesID' },                
                { name: 'SiteName', index: 'SiteName' },
                { name: 'VariableName', index: 'VariableName' },
                { name: 'ValueCount', index: 'ValueCount', width: 70, sorttype: 'int' }                
        ],
        sortname: 'SiteName',
        rowNum: 10000,
        multiselect: true,
        deselectAfterSort: false, // http://www.trirand.com/blog/?page_id=393/help/sorting-multiselect-grid-loses-selection/
        onSelectRow: function (id) {                     
            SeriesDataJSONofSeriesID(id);            
        }
    });
    debugConsole('grid initialized');    
    
    var BeginTime = new Date($('#vis-startdate').val());
    var EndTime = new Date($('#vis-enddate').val());    
    
    var dataStore = $.indexedDB(appName).objectStore(values, 'readonly');

    var countProm = dataStore.count();
    countProm.done(function (result, event) {
        RefreshMyDataCount(result);
    });
    var iterationPromise = dataStore.each(function(item) {
    
        if (new Date(item.value.myMetadata.StartDate) > BeginTime && new Date(item.value.myMetadata.EndDate) < EndTime) {
            var row = { SeriesID: item.key, VariableName: item.value.myMetadata.VariableName, SiteName: item.value.myMetadata.SiteName, ValueCount: item.value.myMetadata.ValueCount };
            $('#SeriesGrid').jqGrid('addRowData', item.value.SeriesID, row);            
        }
        return;
    });
    $('.ui-jqgrid-bdiv').css("overflow-y", "auto").css("height", 250);
}

/* appends HTML to listview */
function RefreshMyDataCount(seriesCount) {
    $('#vis-mydatalink').remove();
    $('#vis-nav').append('<li id="vis-mydatalink"><a href="' + appDomain + '/Vis/Index/" target="_blank">My Data (' + seriesCount + ')</a></li>');
    $('#vis-mydatalink').tooltip({ placement: 'bottom', title: 'Visualize and export time series you have already downloaded.' }); /* should work offline <- test first */
    $('#vis-hisreference').tooltip({ placement: 'bottom', title: 'Learn more about the community effort to publish and share hydrologic data.'});
    $('#vis-apireference').tooltip({ placement: 'bottom', title: 'This web site is powered by an HTTP REST API that is easy to integrate into your own applications and scripts (alpha - interfaces subject to change).'});
}

/* returns 'y1', 'y2', or 'none' depending on whether there is room in the chart for the selected series 
   also updates the flotAxes parameter if appropriate */
function JSONSeriesToFlot(seriesData) {   
    if (flotAxes['y1'].VariableName === seriesData.myMetadata.VariableName) {
        if (flotAxes['y1'].data[seriesData.myMetadata.SeriesID.toString()] === undefined) {
            debugConsole('my variable name matches existing y1 series and is not already plotted so plot this on y1 too, so add it')
            flotAxes['y1'].data[seriesData.myMetadata.SeriesID] = seriesData;
            return 'y1';
            
        } else {
            debugConsole('my variable name matches existing y1 and is already plotted so remove it from plot (uncheck case)');
            delete flotAxes['y1'].data[seriesData.myMetadata.SeriesID];
            if (Object.keys(flotAxes['y1'].data) < 1) {
                flotAxes['y1'].VariableName = '';
            }
            return 'rem';
        }        
    } 
    else if (flotAxes['y2'].VariableName === seriesData.myMetadata.VariableName) {
        
        if (flotAxes['y2'].data[seriesData.myMetadata.SeriesID.toString()] === undefined) {
            debugConsole('my variable name matches existing y2 and is not already plotted so plot this on y2 too, so add it');
            flotAxes['y2'].data[seriesData.myMetadata.SeriesID] = seriesData;
            return 'y2';
        } else {
            debugConsole('my variable name matches existing y2 and is already plotted so remove it from plot (uncheck case)')
            delete flotAxes['y2'].data[seriesData.myMetadata.SeriesID];
            if (Object.keys(flotAxes['y2'].data) < 1) {
                flotAxes['y2'].VariableName = '';
            }
            return 'rem';
        }        
    }
    else if (flotAxes['y2'].VariableName.length < 1 && flotAxes['y1'].VariableName.length > 0) {
        debugConsole('i do not match y1 and there is no y2, so take y2');
        flotAxes['y2'].VariableName = seriesData.myMetadata.VariableName;
        flotAxes['y2'].data[seriesData.myMetadata.SeriesID] = seriesData;
        return 'y2';

    }
    else if (flotAxes['y1'].VariableName.length < 1) {
        debugConsole('y1 is my only option, and it is open, so use y1')
        flotAxes['y1'].VariableName = seriesData.myMetadata.VariableName;
        flotAxes['y1'].data[seriesData.myMetadata.SeriesID] = seriesData;
        return 'y1';
    }
    else /* no room on chart */
        return 'none';
}

/* takes lists of seriesdata objects to be put on different axes, plots them */
function doFlot(y1seriesdata, y2seriesdata) { 
    var dataList = new Array();
    var yaxesList = new Array();
    var gotOne = false;

    $.each(y1seriesdata, function (i, seriesData) {
        var d1 = [];
        if (gotOne === false) {
            yaxesList.push({ position: 'left', axisLabel: seriesData.myMetadata.VariableName });
        }
        for (var i = 0; i < seriesData.values.length; i++) {
            var date = new Date(seriesData.values[i].TimeStamp); // asp.net MVC4 libraries do not apply JSON date conversion in serialization
            d1.push([date.getTime(), seriesData.values[i].Value]);
        }
        dataList.push({ data: d1, label: seriesData.myMetadata.VariableName + ', ' + seriesData.myMetadata.SiteName + ' [' + seriesData.unitAbbrev + ']' });

    });    
    
    gotOne = false;
    $.each(y2seriesdata, function(i, seriesData) { 
        var d1 = [];
        if (gotOne === false) {
            yaxesList.push({ position: 'right', axisLabel: seriesData.myMetadata.VariableName });
        }
        for (var i = 0; i < seriesData.values.length; i++) {
            var date = new Date(seriesData.values[i].TimeStamp); // asp.net MVC4 libraries do not apply JSON date conversion in serialization
            d1.push([date.getTime(), seriesData.values[i].Value]);
        }
        dataList.push({ data: d1, label: seriesData.myMetadata.VariableName + ', ' + seriesData.myMetadata.SiteName + ' [' + seriesData.unitAbbrev + ']', yaxis: 2 });
    });
    
    if (y1seriesdata.length > 0 && y2seriesdata.length > 0) {
        yaxesList = [{
            position: 'left',
            axisLabel: y1seriesdata[0]
        }, {}]
    } else if (y1seriesdata.length > 0) { }
    else if (y2seriesdata.length > 0) { }
    

    var plot = jQuery.plot($('#flotPlot'),
        dataList,
        {
            xaxes: [ { mode: 'time' } ],
            legend: {
                position: 'sw',
                container: $('#flotLegend')
            },
            zoom: { interactive: true },            
            yaxes: [ { }, { position: "right" } ]
        });
}

/* get the SeriesData object from the local objectStore */
function SeriesDataJSONofSeriesID(SeriesID) {
    var dataStore = $.indexedDB(appName).objectStore(values, 'readonly');
    var promise = dataStore.get(parseInt(SeriesID));
    
    promise.done(function (result, event) {
        debugConsole(result);
        var axis = JSONSeriesToFlot(result);
        if (axis === 'y1' || axis === 'y2' || axis === 'rem') {            
            var y1 = [];
            for (var key in flotAxes['y1'].data) {
                y1.push(flotAxes['y1'].data[key]);
            }
            var y2 = [];
            for (var key in flotAxes['y2'].data) {
                y2.push(flotAxes['y2'].data[key]);
            }
            doFlot(y1, y2);
            if (y1.length < 1 && y2.length < 1) {
                $('#flotLegend').html('');
            }
        }
        else if (axis === 'none') {
            $('#gbox_SeriesGrid').append(getTooManySeriesForFlotAlert());
        }
    });
    promise.fail(function (error, event) {
        debugConsole('SeriesDataJSONofSeriesID error event: ');
        debugConsole(error);
        debugConsole(event);
    });
}

function getTooManySeriesForFlotAlert() {
    return '<div class="alert"><button type="button" class="close" data-dismiss="alert">×</button><strong>Notice!</strong>You can only plot two different variables at the same time on this screen.</div>';
}

// converts object array into csv file and downloads to your computer. courtesy: http://stackoverflow.com/questions/4130849/convert-json-format-to-csv-format-for-ms-excel
function DownloadJSON2CSV(objArray) {
    var array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;

    var str = '';

    for (var i = 0; i < array.length; i++) {
        var line = '';

        for (var index in array[i]) {
            line += array[i][index] + ',';
        }

        // Here is an example where you would wrap the values in double quotes
        // for (var index in array[i]) {
        //    line += '"' + array[i][index] + '",';
        // }

        line.slice(0, line.Length - 1);

        str += line + '\r\n';
    }
    window.open("data:text/csv;charset=utf-8," + escape(str))
}

