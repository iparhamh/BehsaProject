using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using MyApiServer.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace MyApiServer.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class SecureController : ControllerBase
    {
        [HttpGet("data")]
        public IActionResult GetData()
        {
            return Ok(new { Data = "This is secured data" });
        }
    }

    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly JwtSettings _jwtSettings;

        public AuthController(IOptions<JwtSettings> jwtSettings)
        {
            _jwtSettings = jwtSettings.Value;
        }

        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginModel loginModel)
        {
            // In a real application, you would validate the user credentials from a database
            if (loginModel.Username == "testuser" && loginModel.Password == "password")
            {
                var claims = new[]
                {
                    new Claim(ClaimTypes.Name, loginModel.Username)
                };

                var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSettings.Key));
                var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

                var token = new JwtSecurityToken(
                    _jwtSettings.Issuer,
                    _jwtSettings.Audience,
                    claims,
                    expires: DateTime.Now.AddMinutes(30),
                    signingCredentials: creds
                );

                return Ok(new
                {
                    Token = new JwtSecurityTokenHandler().WriteToken(token)
                });
            }

            return Unauthorized();
        }
    }
}

public class LoginModel
{
    public string Username { get; set; }
    public string Password { get; set; }
}
