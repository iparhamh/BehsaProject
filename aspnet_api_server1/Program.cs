using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Pomelo.EntityFrameworkCore.MySql.Infrastructure;
using System.Text;
using MyApiServer.Models; // Adjust this namespace according to your project
using MyApiServer.Data; // Adjust this namespace according to your project

var builder = WebApplication.CreateBuilder(args);

// Configure MySQL database connection
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(builder.Configuration.GetConnectionString("DefaultConnection"),
        new MySqlServerVersion(new Version(8, 0, 33)))); // Adjust the MySQL server version as needed

// Add services to the container
builder.Services.AddControllers();

// Configure JWT Authentication
var jwtSection = builder.Configuration.GetSection("Jwt");
builder.Services.Configure<JwtSettings>(jwtSection);
var jwtSettings = jwtSection.Get<JwtSettings>();

// Validate configuration values
if (string.IsNullOrEmpty(jwtSettings.Key))
{
    throw new InvalidOperationException("JWT key must be configured.");
}
if (string.IsNullOrEmpty(jwtSettings.Issuer))
{
    throw new InvalidOperationException("JWT issuer must be configured.");
}
if (string.IsNullOrEmpty(jwtSettings.Audience))
{
    throw new InvalidOperationException("JWT audience must be configured.");
}

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings.Issuer,
        ValidAudience = jwtSettings.Audience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Key))
    };
});

// Add Authorization services
builder.Services.AddAuthorization();

// Add Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "My API V1"));
}

app.UseHttpsRedirection();

app.UseRouting(); // Ensure routing is added

app.UseAuthentication(); // Ensure authentication is added
app.UseAuthorization();  // Ensure authorization is added

app.MapControllers(); // Map controllers

app.Run();
