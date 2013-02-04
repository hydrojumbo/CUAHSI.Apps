Getting Started
---------------
####NOTE: 
CUAHSI.Browser currently relies on the ASP.NET web server stack to host the HTML, JS, CSS, and image resources that power the decision support system. This provides a minimal-effort means of getting up and running quickly, although it does introduce the .NET framework as a dependency. It is possible to run CUAHSI.Browser from an alternative web server. The easiest way to do this is to choose one of the technologies for which there is an Azure SDK (Java, Python, nodejs are probably the most likely options), and rebuild the application on those dependencies.

Install the Windows Azure .NET SDK and Tools with the web platform installer (http://go.microsoft.com/fwlink/?LinkID=254364&clcid=0x409 for Visual Studio 2012), you should be able to pull this repository from github, open the solution (.sln) in Visual Studio, turn on Nuget pull during the build (http://docs.nuget.org/docs/workflows/using-nuget-without-committing-packages), right-click on the Solution in the Solution Explorer pane and choose "Enable Nuget Package Restore" from the menu, and press play on Visual Studio to start running your own instance of the data.cuahsi.org/ app from your localhost. Cross-origin resource sharing implemented in the data.cuahsi.org HTTP API service allows you to make the necessary AJAX requests to data services run by the CUAHSI Water Data Center, no matter where your app is hosted.

####The main files you want to deal with are in the CUAHSI.Browser app:

####Scripts/
  + cuahsidata.js => contains in-browser database definitions, and global API parameters
  + datavis.js => contains generic data visualization framework for representing data from the in-browser database with jqGrid (table display) and flot (line series plots); extendable into application-specific decision support systems.
  + discovery.js => contains application code for discovery interface; this component is closer to stable than datavis.js, and could be coupled as-is to a more advanced datavis.js to create useful dss systems.

####Views/
  + Home/Index.cshtml => defines structure of discovery UI (home page) page
  + Vis/Index.cshtml => defines structure of data visualization UI (extend this page to create DSS apps)

####App_Start/
  + BundleConfig.cs => if you want to add a js or css dependency, include it in the appropriate ScriptBundle ("~/bundles/discovery" or "~/bundles/datavis") or in the "~/Content/css" StyleBundle.

####Also, in the CUAHSI.Apps solution:
  + ServiceConfiguration.Cloud.cscfg => if you want to publish your application to a live cloud system:
    1. Get an Azure subscription. 
    2. Create a new storage account. 
    3. Copy one of the two connection strings of the new storage account to the Microsoft.WindowsAzure.Plugins.Diagnostics.ConnectionString value in this file. 
    4. You may also wish to increase your instances count for greater guarantees of availability. 
    5. After making these modifications, you can follow standard instructions for publishing a Web Role to Windows Azure: http://msdn.microsoft.com/en-us/library/windowsazure/ff683672.aspx
