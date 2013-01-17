using System.Web;
using System.Web.Optimization;

namespace CUAHSI.Browser
{
    public class BundleConfig
    {
        // For more information on Bundling, visit http://go.microsoft.com/fwlink/?LinkId=254725
        public static void RegisterBundles(BundleCollection bundles)
        {
            bundles.Add(new ScriptBundle("~/bundles/jquery").Include(
                // "~/Scripts/jquery-{version}.js"));
                                    "~/Scripts/jquery-1.7.2.js"));

            bundles.Add(new ScriptBundle("~/bundles/jqueryui").Include(
                // "~/Scripts/jquery-ui-{version}.js"));
                         "~/Scripts/jquery-ui-1.8.20.js"));

            bundles.Add(new ScriptBundle("~/bundles/jqueryval").Include(
                        "~/Scripts/jquery.unobtrusive*",
                        "~/Scripts/jquery.validate*"));

            // Use the development version of Modernizr to develop with and learn from. Then, when you're
            // ready for production, use the build tool at http://modernizr.com to pick only the tests you need.
            bundles.Add(new ScriptBundle("~/bundles/modernizr").Include(
                        "~/Scripts/modernizr-*"));

            bundles.Add(new ScriptBundle("~/bundles/compatibility").Include(
                        "~/Scripts/modernizr-*",
                        "~/Scripts/IndexedDBShim.min.js"));

            bundles.Add(new ScriptBundle("~/bundles/bootstrap").Include(
                        "~/Scripts/bootstrap.js"));

            bundles.Add(new ScriptBundle("~/bundles/v7").Include(
                        "~/Scripts/V7CustomInfobox.min.js",
                        "~/Scripts/V7ClientSideClustering-min.js"));

            bundles.Add(new ScriptBundle("~/bundles/discovery").Include(
                        "~/Scripts/jquery-1.7.2.js",
                        "~/Scripts/jquery-ui-1.8.20.js",
                        "~/Scripts/bootstrap.js",
                        "~/Scripts/jquery.indexeddb.js",
                        "~/Scripts/jqgrid/js/i18n/grid.locale-en.js",
                        "~/Scripts/jqgrid/js/jquery.jqGrid.js",
                        "~/Scripts/mapcontrol.js",
                // "~/Scripts/jquery.tagsinput.js",
                        "~/Scripts/cuahsidata.js",
                        "~/Scripts/discovery.js"));

            bundles.Add(new ScriptBundle("~/bundles/datavis").Include(
                        "~/Scripts/jquery-1.7.2.js",
                        "~/Scripts/jquery-ui-1.8.20.js",
                        "~/Scripts/bootstrap.js",
                        "~/Scripts/jquery.indexeddb.js",
                        "~/Scripts/jqgrid/js/i18n/grid.locale-en.js",
                        "~/Scripts/jqgrid/js/jquery.jqGrid.js",
                        "~/Scripts/mapcontrol.js",
                // "~/Scripts/jquery.tagsinput.js",
                        "~/Scripts/cuahsidata.js",
                        "~/Scripts/jquery.flot.js",
                        "~/Scripts/jquery.flot.axislabels.js",
                        "~/Scripts/datavis.js"));

            /*bundles.Add(new ScriptBundle("~/bundles/flot").Include(
                        "~/Scripts/jquery.flot.min.js"));*/

            /*bundles.Add(new ScriptBundle("~/bundles/mapandtable").Include(
                        "~/Scripts/jquery.jqGrid.js",
                        "~/Scripts/mapcontrol.js"));*/

            bundles.Add(new ScriptBundle("~/bundles/shim").Include(
                        "~/Scripts/IndexedDBShim.min.js"));

            bundles.Add(new ScriptBundle("~/bundles/cuahsi").Include(
                        "~/Scripts/jquery-1.7.2.js",
                        "~/Scripts/jquery-ui-1.8.20.js",
                        "~/Scripts/bootstrap.js",
                        "~/Scripts/jquery.indexeddb.js",
                        "~/Scripts/jqgrid/js/i18n/grid.locale-en.js",
                        "~/Scripts/jqgrid/js/jquery.jqGrid.js",
                        "~/Scripts/mapcontrol.js",
                // "~/Scripts/jquery.tagsinput.js",
                        "~/Scripts/cuahsidata.js"));

            bundles.Add(new StyleBundle("~/Content/bootstrap").Include(
                        "~/Content/bootstrap.css"));

            bundles.Add(new StyleBundle("~/Content/bootstrap-responsive").Include(
                        "~/Content/bootstrap-responsive.min.css"));

            bundles.Add(new StyleBundle("~/Content/css").Include(
                // "~/Content/jquery.tagsinput.css",        
                "~/Content/Site.css"));

            bundles.Add(new StyleBundle("~/Content/uijqgrid").Include(
                        "~/Scripts/jqgrid/css/ui.jqgrid.css"));

            bundles.Add(new StyleBundle("~/Content/themes/base/css").Include(
                        "~/Content/themes/base/jquery.ui.core.css",
                        "~/Content/themes/base/jquery.ui.resizable.css",
                        "~/Content/themes/base/jquery.ui.selectable.css",
                        "~/Content/themes/base/jquery.ui.accordion.css",
                        "~/Content/themes/base/jquery.ui.autocomplete.css",
                        "~/Content/themes/base/jquery.ui.button.css",
                        "~/Content/themes/base/jquery.ui.dialog.css",
                        "~/Content/themes/base/jquery.ui.slider.css",
                        "~/Content/themes/base/jquery.ui.tabs.css",
                        "~/Content/themes/base/jquery.ui.datepicker.css",
                        "~/Content/themes/base/jquery.ui.progressbar.css",
                        "~/Content/themes/base/jquery.ui.theme.css"));
        }
    }
}