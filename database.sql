CREATE DATABASE CrmDb;
GO
USE CrmDb;
GO

CREATE TABLE Users (
    Id INT IDENTITY PRIMARY KEY,
    Name NVARCHAR(100) NOT NULL,
    Email NVARCHAR(200) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(100) NOT NULL,
    Role NVARCHAR(10) NOT NULL CHECK (Role IN ('Admin', 'Sales'))
);

CREATE TABLE Customers (
    Id INT IDENTITY PRIMARY KEY,
    Company NVARCHAR(200) NOT NULL,
    ContactName NVARCHAR(100) NOT NULL,
    Email NVARCHAR(200),
    Phone NVARCHAR(50),
    City NVARCHAR(100)
);

CREATE TABLE Deals (
    Id INT IDENTITY PRIMARY KEY,
    Title NVARCHAR(200) NOT NULL,
    Value DECIMAL(18, 2) NOT NULL,
    Stage NVARCHAR(20) NOT NULL CHECK (Stage IN ('LEAD', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST')),
    CustomerId INT NOT NULL REFERENCES Customers(Id),
    OwnerId INT NOT NULL REFERENCES Users(Id),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
);

CREATE TABLE Activities (
    Id INT IDENTITY PRIMARY KEY,
    DealId INT NOT NULL REFERENCES Deals(Id),
    Type NVARCHAR(10) NOT NULL CHECK (Type IN ('CALL', 'EMAIL', 'MEETING', 'NOTE')),
    Note NVARCHAR(1000) NOT NULL,
    UserId INT NOT NULL REFERENCES Users(Id),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
);

CREATE TABLE Tasks (
    Id INT IDENTITY PRIMARY KEY,
    Title NVARCHAR(200) NOT NULL,
    DueDate DATE NOT NULL,
    Done BIT NOT NULL DEFAULT 0,
    UserId INT NOT NULL REFERENCES Users(Id)
);
GO

-- Password for both users: Demo@123
INSERT INTO Users (Name, Email, PasswordHash, Role) VALUES
('Admin User', 'admin@demo.com', '$2a$11$zk9aggk5VDCMIsdiavjtU.KqdT6Eh0nbk9MZeXsOpdsjQ0rRANh9q', 'Admin'),
('Sales User', 'sales@demo.com', '$2a$11$zk9aggk5VDCMIsdiavjtU.KqdT6Eh0nbk9MZeXsOpdsjQ0rRANh9q', 'Sales');

INSERT INTO Customers (Company, ContactName, Email, Phone, City) VALUES
('Northwind Traders', 'Sara Haddad', 'sara@northwind.example', '555-0101', 'Beirut'),
('Blue Harbor Logistics', 'Omar Khalil', 'omar@blueharbor.example', '555-0102', 'Dubai'),
('Cedar Foods', 'Lina Nasser', 'lina@cedarfoods.example', '555-0103', 'Tripoli'),
('Atlas Construction', 'James Carter', 'james@atlas.example', '555-0104', 'London'),
('Brightline Media', 'Maya Saleh', 'maya@brightline.example', '555-0105', 'Amman'),
('Summit Software', 'Daniel Reed', 'daniel@summit.example', '555-0106', 'Berlin'),
('Olive Tree Hotels', 'Rana Aoun', 'rana@olivetree.example', '555-0107', 'Cairo'),
('Metro Medical', 'Peter Young', 'peter@metromedical.example', '555-0108', 'Paris');

INSERT INTO Deals (Title, Value, Stage, CustomerId, OwnerId, CreatedAt) VALUES
('Warehouse software', 12000, 'LEAD', 1, 2, DATEADD(DAY, -3, GETDATE())),
('Fleet tracking rollout', 45000, 'PROPOSAL', 2, 2, DATEADD(DAY, -12, GETDATE())),
('Online ordering portal', 18500, 'NEGOTIATION', 3, 2, DATEADD(DAY, -20, GETDATE())),
('Site safety system', 30000, 'LEAD', 4, 1, DATEADD(DAY, -5, GETDATE())),
('Campaign dashboard', 9500, 'WON', 5, 2, DATEADD(DAY, -40, GETDATE())),
('Support contract renewal', 22000, 'WON', 6, 1, DATEADD(DAY, -35, GETDATE())),
('Booking system upgrade', 27500, 'PROPOSAL', 7, 1, DATEADD(DAY, -9, GETDATE())),
('Patient records module', 60000, 'NEGOTIATION', 8, 1, DATEADD(DAY, -25, GETDATE())),
('Loyalty app', 15000, 'LOST', 3, 2, DATEADD(DAY, -50, GETDATE())),
('Delivery route planner', 8000, 'LEAD', 2, 2, DATEADD(DAY, -1, GETDATE()));

INSERT INTO Activities (DealId, Type, Note, UserId, CreatedAt) VALUES
(2, 'CALL', 'Walked through the proposal with Omar.', 2, DATEADD(DAY, -6, GETDATE())),
(2, 'EMAIL', 'Sent the updated pricing.', 2, DATEADD(DAY, -2, GETDATE())),
(3, 'MEETING', 'Reviewed contract terms on site.', 2, DATEADD(DAY, -4, GETDATE())),
(8, 'NOTE', 'Waiting for sign-off from their IT team.', 1, DATEADD(DAY, -1, GETDATE())),
(5, 'CALL', 'Confirmed the deal is signed.', 2, DATEADD(DAY, -30, GETDATE()));

INSERT INTO Tasks (Title, DueDate, Done, UserId) VALUES
('Call Omar about the fleet proposal', CAST(GETDATE() AS DATE), 0, 2),
('Send contract draft to Cedar Foods', DATEADD(DAY, -2, CAST(GETDATE() AS DATE)), 0, 2),
('Prepare warehouse software demo', DATEADD(DAY, 3, CAST(GETDATE() AS DATE)), 0, 2),
('Update the campaign dashboard notes', DATEADD(DAY, -5, CAST(GETDATE() AS DATE)), 1, 2),
('Review the patient records quote', CAST(GETDATE() AS DATE), 0, 1),
('Check in with Atlas Construction', DATEADD(DAY, -1, CAST(GETDATE() AS DATE)), 0, 1),
('Plan next quarter targets', DATEADD(DAY, 7, CAST(GETDATE() AS DATE)), 0, 1);
GO
