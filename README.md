CUAHSI.Apps - public hydrologic data applications
===========

###CUAHSI.Apps is a platform for creating decision support and data visualization tools connected to CUAHSI Water Data Center data services. The platform provides:
+ Already-working data discovery, storage, and visualization components to customize
+ No required networking - CUAHSI.Apps projects take care of all of the internet communications, you can focus on the application and user experience.
+ Offline-ready - because data you download within these apps is stored locally on the user's machine in a database, any applications built to use that data can run without internet connectivity.
+ CUAHSI HIS API - provides a means of searching and downloading data from many public data providers of hydrologic data.

Current CUAHSI.Apps projects:
-----------------------------

####CUAHSI.Browser
An HTML5 + JS + CSS + IndexedDB + ASP.NET MVC4 two-tab browser application that combines a pre-built user interface for finding and downloading hydrologic data from CUAHSI data services, with a flexible data visualization page capable of rendering downloaded data. The data visualization page and local database can be extended into a browser-based decision support system (DSS) that can use real-world public hydrologic data without making any network requests - data a user downloads is already inside the in-browser IndexedDB database. This project is configured to run inside the Windows Azure live and local emulation environments. This means that with the required programs installed on your computer, you can begin prototyping a working decision support system built out of HTML, JS, and CSS. If you later decide to host your application in the cloud, you can replace a setting in a configuration file with information from your Windows Azure subscription, and deploy to your own cloud subscription.

