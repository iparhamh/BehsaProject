using Microsoft.AspNetCore.Mvc;

namespace MyApiServer.Controllers
{
    public class HomeController : Controller
    {
        // Action for the Index page
        public IActionResult Index()
        {
            return View();
        }

        // Action for the Privacy page
        public IActionResult Privacy()
        {
            return View();
        }
    }
}
