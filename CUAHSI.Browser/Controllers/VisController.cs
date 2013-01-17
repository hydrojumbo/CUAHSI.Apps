/*
 * Copyright (c) 2013, Alex Bedig, New BSD License: https://github.com/hydrojumbo/CUAHSI.Apps/blob/master/LICENSE.md
 */

using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Microsoft.WindowsAzure.ServiceRuntime;

namespace CUAHSI.Browser.Controllers
{
    /// <summary>
    /// Serves data visualization and decision support systems along the /Vis/ route.
    /// </summary>
    /// <remarks>Set the ServiceDomain values in the ServiceConfiguration file such that your Discovery app calls point to the correct API. For most users, this will be https://data.cuahsi.org/. The only time the ViewBag.ServiceDomain value should be different is when you want to use a different API for discovery and data download.</remarks>
    public class VisController : Controller
    {
        /// <summary>
        /// Serves the HTML decision support/data visualization view linked to by the Discovery page (the default view).
        /// </summary>
        /// <returns></returns>
        public ActionResult Index()
        {
            ViewBag.Message = "CUAHSI Hydrologic Data Visualization Client";
#if DEBUG
            ViewBag.ServiceDomain = RoleEnvironment.GetConfigurationSettingValue("StagingServiceDomain");
#else
            ViewBag.ServiceDomain = RoleEnvironment.GetConfigurationSettingValue("ProductionServiceDomain");
#endif
            string sessionguid = Guid.NewGuid().ToString();
            ViewBag.ThisSession = sessionguid;            
            return View();
        }

    }
}