# CRM System

A simple CRM for managing customers, a drag-and-drop deals board, deal activities and tasks.

## Stack

- API: ASP.NET Core .NET 10 Minimal APIs, Dapper, SQL Server, JWT, BCrypt
- Web: React, TypeScript, Vite, React Router, Axios, lucide-react

## How to run

You need the .NET 10 SDK, Node.js and SQL Server.

1. Create the database (this example uses SQL Express):

   ```
   sqlcmd -S .\SQLEXPRESS -E -C -b -i database.sql
   ```

2. Create `api/appsettings.Development.json` (git-ignored). The key must be at least 32 characters:

   ```json
   {
     "Jwt": { "Key": "your-random-secret-of-at-least-32-characters" },
     "ConnectionStrings": {
       "Default": "Server=.\\SQLEXPRESS;Database=CrmDb;Trusted_Connection=True;TrustServerCertificate=True"
     }
   }
   ```

3. Start the API at http://localhost:5000 (API docs at http://localhost:5000/scalar):

   ```
   cd api
   dotnet run
   ```

4. Start the web app at http://localhost:5173:

   ```
   cd web
   npm install
   npm run dev
   ```

## Demo logins

| Email          | Password | Role  |
| -------------- | -------- | ----- |
| admin@demo.com | Demo@123 | Admin |
| sales@demo.com | Demo@123 | Sales |

Sales sees only their own deals and tasks. Admin sees everything, and only Admin can delete.
