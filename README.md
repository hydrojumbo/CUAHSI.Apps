CUAHSI.Apps
===========

###CUAHSI.Apps is a platform for creating decision support and data visualization tools connected to CUAHSI Water Data Center data services. CUAHSI.Apps consists of:

####CUAHSI.Browser
An HTML5 + JS + CSS + IndexedDB two-tab browser application that combines a pre-built user interface for finding and downloading hydrologic data from CUAHSI data services, with a flexible data visualization page capable of rendering downloaded data. The data visualization page and local database can be extended into a browser-based decision support system (DSS) that can use real-world public hydrologic data without making any network requests - data a user downloads is already inside the in-browser IndexedDB database. This project is configured to run inside the Windows Azure live and local emulation environments. This means that with the required programs installed on your computer, you can begin prototyping a working decision support system built out of HTML, JS, and CSS. If you later decide to host your application in the cloud, you can replace a setting in a configuration file with information from your Windows Azure subscription, and deploy to your own cloud system.


Getting Started
---------------

Install the Windows Azure .NET SDK and Tools with the web platform installer (http://go.microsoft.com/fwlink/?LinkID=254364&clcid=0x409 for Visual Studio 2012), you should be able to pull this repository from github, open the solution (.sln) in Visual Studio, turn on Nuget pull during the build (http://docs.nuget.org/docs/workflows/using-nuget-without-committing-packages), and press play on Visual Studio to start running your own instance of the data.cuahsi.org/ app from your localhost. Cross-origin resource sharing implemented in the data.cuahsi.org HTTP API service allows you to make the necessary AJAX requests to data services run by the CUAHSI Water Data Center.

####The main files you want to deal with are in the CUAHSI.Browser app:

####Scripts/
  ^ cuahsidata.js => contains in-browser database definitions, and global API parameters
  ^ datavis.js => contains generic data visualization framework for representing data from the in-browser database with jqGrid (table display) and flot (line series plots); extendable into application-specific decision support systems.
  ^ discovery.js => contains application code for discovery interface; this component is closer to stable than datavis.js, and could be coupled as-is to a more advanced datavis.js to create useful dss systems.

####Views/
  ^ Home/Index.cshtml => defines structure of discovery UI (home page) page
  ^ Vis/Index.cshtml => defines structure of data visualization UI (extend this page to create DSS apps)

####App_Start/
  ^ BundleConfig.cs => if you want to add a js or css dependency, include it in the appropriate ScriptBundle ("~/bundles/discovery" or "~/bundles/datavis") or in the "~/Content/css" StyleBundle.

####Also, in the CUAHSI.Apps solution:
^ ServiceConfiguration.Cloud.cscfg => if you want to publish your application to a live cloud system, get an Azure subscription, create a new storage account, and copy its connection string to the Microsoft.WindowsAzure.Plugins.Diagnostics.ConnectionString value in this file. You may also wish to increase your instances count for greater guarantees of availability. After making these modifications, you can follow standard instructions for publishing a Web Role to Windows Azure: http://msdn.microsoft.com/en-us/library/windowsazure/ff683672.aspx
