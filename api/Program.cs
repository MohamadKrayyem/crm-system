using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Dapper;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.Data.SqlClient;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);
var connectionString = builder.Configuration.GetConnectionString("Default");
var jwtKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!));

builder.Services.AddOpenApi(options => options.AddDocumentTransformer((document, _, _) =>
{
    document.Components ??= new();
    document.Components.SecuritySchemes = new Dictionary<string, IOpenApiSecurityScheme>
    {
        ["Bearer"] = new OpenApiSecurityScheme { Type = SecuritySchemeType.Http, Scheme = "bearer", BearerFormat = "JWT" }
    };
    return Task.CompletedTask;
}));
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        IssuerSigningKey = jwtKey,
        ValidateIssuer = false,
        ValidateAudience = false
    };
});
// Every endpoint needs login unless it says AllowAnonymous
builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build();
    options.AddPolicy("Admin", policy => policy.RequireRole("Admin"));
});

var app = builder.Build();

app.UseExceptionHandler(error => error.Run(async context =>
{
    var ex = context.Features.Get<IExceptionHandlerFeature>()?.Error;
    // 547 = foreign key or check constraint, 2628 = text too long
    var badInput = ex is BadHttpRequestException or SqlException { Number: 547 or 2628 };
    context.Response.StatusCode = badInput ? 400 : 500;
    await context.Response.WriteAsJsonAsync(new
    {
        message = badInput ? "Invalid data, or the record is linked to other records" : "Something went wrong"
    });
}));
// Gives empty 401, 403, 404 etc. responses a { message } body
app.UseStatusCodePages(context => context.HttpContext.Response.WriteAsJsonAsync(new
{
    message = context.HttpContext.Response.StatusCode switch
    {
        401 => "Please log in",
        403 => "You are not allowed to do this",
        404 => "Not found",
        _ => "Bad request"
    }
}));
app.UseAuthentication();
app.UseAuthorization();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi().AllowAnonymous();
    app.MapScalarApiReference().AllowAnonymous();
}

SqlConnection Db() => new(connectionString);
IResult Error(string message, int status = 400) => Results.Json(new { message }, statusCode: status);
int UserId(ClaimsPrincipal user) => int.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
bool IsAdmin(ClaimsPrincipal user) => user.IsInRole("Admin");

app.MapPost("/api/auth/login", async (LoginRequest login) =>
{
    if (string.IsNullOrWhiteSpace(login.Email) || string.IsNullOrEmpty(login.Password))
        return Error("Email and password are required");

    using var db = Db();
    var user = await db.QueryFirstOrDefaultAsync<User>(
        "SELECT Id, Name, Email, PasswordHash, Role FROM Users WHERE Email = @Email", new { login.Email });
    if (user == null || !BCrypt.Net.BCrypt.Verify(login.Password, user.PasswordHash))
        return Error("Wrong email or password", 401);

    var claims = new[]
    {
        new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
        new Claim(ClaimTypes.Name, user.Name),
        new Claim(ClaimTypes.Role, user.Role)
    };
    var token = new JwtSecurityToken(
        claims: claims,
        expires: DateTime.UtcNow.AddHours(8),
        signingCredentials: new SigningCredentials(jwtKey, SecurityAlgorithms.HmacSha256));

    return Results.Ok(new
    {
        token = new JwtSecurityTokenHandler().WriteToken(token),
        user = new { user.Name, user.Role }
    });
}).AllowAnonymous();

app.MapGet("/api/dashboard", async (ClaimsPrincipal user) =>
{
    using var db = Db();
    return await db.QuerySingleAsync<Dashboard>(
        """
        SELECT
            (SELECT ISNULL(SUM(Value), 0) FROM Deals WHERE Stage NOT IN ('WON', 'LOST') AND (@admin = 1 OR OwnerId = @userId)) AS OpenValue,
            (SELECT ISNULL(SUM(Value), 0) FROM Deals WHERE Stage = 'WON' AND (@admin = 1 OR OwnerId = @userId)) AS WonValue,
            (SELECT COUNT(*) FROM Customers) AS Customers,
            (SELECT COUNT(*) FROM Tasks WHERE Done = 0 AND DueDate = CAST(GETDATE() AS DATE) AND (@admin = 1 OR UserId = @userId)) AS TasksDueToday
        """,
        new { admin = IsAdmin(user), userId = UserId(user) });
});

var customers = app.MapGroup("/api/customers");

customers.MapGet("/", async () =>
{
    using var db = Db();
    return await db.QueryAsync<Customer>("SELECT Id, Company, ContactName, Email, Phone, City FROM Customers ORDER BY Company");
});

customers.MapPost("/", async (Customer customer) =>
{
    if (string.IsNullOrWhiteSpace(customer.Company) || string.IsNullOrWhiteSpace(customer.ContactName))
        return Error("Company and contact name are required");

    using var db = Db();
    var id = await db.ExecuteScalarAsync<int>(
        """
        INSERT INTO Customers (Company, ContactName, Email, Phone, City)
        OUTPUT INSERTED.Id
        VALUES (@Company, @ContactName, @Email, @Phone, @City)
        """, customer);
    return Results.Ok(customer with { Id = id });
});

customers.MapPut("/{id:int}", async (int id, Customer customer) =>
{
    if (string.IsNullOrWhiteSpace(customer.Company) || string.IsNullOrWhiteSpace(customer.ContactName))
        return Error("Company and contact name are required");

    using var db = Db();
    var rows = await db.ExecuteAsync(
        """
        UPDATE Customers
        SET Company = @Company, ContactName = @ContactName, Email = @Email, Phone = @Phone, City = @City
        WHERE Id = @id
        """, new { id, customer.Company, customer.ContactName, customer.Email, customer.Phone, customer.City });
    return rows == 0 ? Error("Customer not found", 404) : Results.Ok(customer with { Id = id });
});

customers.MapDelete("/{id:int}", async (int id) =>
{
    using var db = Db();
    var rows = await db.ExecuteAsync("DELETE FROM Customers WHERE Id = @id", new { id });
    return rows == 0 ? Error("Customer not found", 404) : Results.NoContent();
}).RequireAuthorization("Admin");

var deals = app.MapGroup("/api/deals");

const string dealSql =
    """
    SELECT d.Id, d.Title, d.Value, d.Stage, d.CustomerId, c.Company, d.OwnerId, u.Name AS OwnerName, d.CreatedAt
    FROM Deals d
    JOIN Customers c ON c.Id = d.CustomerId
    JOIN Users u ON u.Id = d.OwnerId
    WHERE (@admin = 1 OR d.OwnerId = @userId)
    """;

deals.MapGet("/", async (ClaimsPrincipal user) =>
{
    using var db = Db();
    return await db.QueryAsync<Deal>(dealSql + " ORDER BY d.Id DESC", new { admin = IsAdmin(user), userId = UserId(user) });
});

deals.MapGet("/{id:int}", async (int id, ClaimsPrincipal user) =>
{
    using var db = Db();
    var deal = await db.QueryFirstOrDefaultAsync<Deal>(dealSql + " AND d.Id = @id", new { id, admin = IsAdmin(user), userId = UserId(user) });
    if (deal == null) return Error("Deal not found", 404);

    var activities = await db.QueryAsync<Activity>(
        """
        SELECT a.Id, a.Type, a.Note, u.Name AS UserName, a.CreatedAt
        FROM Activities a
        JOIN Users u ON u.Id = a.UserId
        WHERE a.DealId = @id
        ORDER BY a.CreatedAt DESC
        """, new { id });
    return Results.Ok(new { deal, activities });
});

deals.MapPost("/", async (NewDeal deal, ClaimsPrincipal user) =>
{
    if (string.IsNullOrWhiteSpace(deal.Title) || deal.CustomerId == 0)
        return Error("Title and customer are required");

    using var db = Db();
    var id = await db.ExecuteScalarAsync<int>(
        """
        INSERT INTO Deals (Title, Value, Stage, CustomerId, OwnerId)
        OUTPUT INSERTED.Id
        VALUES (@Title, @Value, 'LEAD', @CustomerId, @userId)
        """, new { deal.Title, deal.Value, deal.CustomerId, userId = UserId(user) });
    return Results.Ok(new { id });
});

deals.MapPut("/{id:int}/stage", async (int id, StageUpdate update, ClaimsPrincipal user) =>
{
    using var db = Db();
    var rows = await db.ExecuteAsync(
        "UPDATE Deals SET Stage = @Stage WHERE Id = @id AND (@admin = 1 OR OwnerId = @userId)",
        new { id, update.Stage, admin = IsAdmin(user), userId = UserId(user) });
    return rows == 0 ? Error("Deal not found", 404) : Results.NoContent();
});

deals.MapPost("/{id:int}/activities", async (int id, NewActivity activity, ClaimsPrincipal user) =>
{
    if (string.IsNullOrWhiteSpace(activity.Note))
        return Error("Note is required");

    using var db = Db();
    var rows = await db.ExecuteAsync(
        """
        INSERT INTO Activities (DealId, Type, Note, UserId)
        SELECT Id, @Type, @Note, @userId FROM Deals WHERE Id = @id AND (@admin = 1 OR OwnerId = @userId)
        """, new { id, activity.Type, activity.Note, admin = IsAdmin(user), userId = UserId(user) });
    return rows == 0 ? Error("Deal not found", 404) : Results.NoContent();
});

var tasks = app.MapGroup("/api/tasks");

tasks.MapGet("/", async (ClaimsPrincipal user) =>
{
    using var db = Db();
    return await db.QueryAsync<TaskItem>(
        """
        SELECT t.Id, t.Title, t.DueDate, t.Done, u.Name AS UserName
        FROM Tasks t
        JOIN Users u ON u.Id = t.UserId
        WHERE (@admin = 1 OR t.UserId = @userId)
        ORDER BY t.Done, t.DueDate
        """, new { admin = IsAdmin(user), userId = UserId(user) });
});

tasks.MapPost("/", async (NewTask task, ClaimsPrincipal user) =>
{
    if (string.IsNullOrWhiteSpace(task.Title) || task.DueDate == default)
        return Error("Title and due date are required");

    using var db = Db();
    var id = await db.ExecuteScalarAsync<int>(
        """
        INSERT INTO Tasks (Title, DueDate, UserId)
        OUTPUT INSERTED.Id
        VALUES (@Title, @DueDate, @userId)
        """, new { task.Title, task.DueDate, userId = UserId(user) });
    return Results.Ok(new { id });
});

tasks.MapPut("/{id:int}/done", async (int id, DoneUpdate update, ClaimsPrincipal user) =>
{
    using var db = Db();
    var rows = await db.ExecuteAsync(
        "UPDATE Tasks SET Done = @Done WHERE Id = @id AND (@admin = 1 OR UserId = @userId)",
        new { id, update.Done, admin = IsAdmin(user), userId = UserId(user) });
    return rows == 0 ? Error("Task not found", 404) : Results.NoContent();
});

app.Run();
