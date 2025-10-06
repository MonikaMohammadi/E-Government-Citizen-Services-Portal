# E-Government Citizen Services Portal

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Setup DB & environment
npm run setup   # or ./setup.sh

# Start app
npm run dev

# Visit http://localhost:3000
# Login: admin@egov.com / password123
```

## 📌 Overview

A web portal for citizens to apply for government services online. Officers review requests, and admins manage users, services, and departments.

## ✅ Features

* **Authentication & Roles:** Citizen, Officer, Department Head, Admin
* **Citizen:** Apply for services, upload docs, track status, notifications, payments
* **Officer:** Review/approve/reject requests, view documents
* **Admin:** Manage departments, services, users, reports, revenue
* **Extras:** Search, email notifications, file upload validation, security (bcrypt, Helmet, rate limiting)

## 🛠 Tech Stack

* **Backend:** Node.js, Express.js
* **Database:** PostgreSQL
* **Views:** EJS + Bootstrap
* **Auth:** bcryptjs + express-session
* **Uploads:** Multer

## 📂 Project Structure

```
app.js
config/       # DB config
controllers/  # Logic
middlewares/  # Auth & roles
models/       # DB models
routes/       # Routes
views/        # EJS templates
public/       # Static files
database/     # schema.sql
```

## 🔑 Test Accounts (after seeding)

* **Admin:** [admin@egov.com](mailto:admin@egov.com) / password123
* **Officers:** [ali@egov.com](mailto:ali@egov.com) / password123
* **Citizens:** [morsal@gmail.com](mailto:morsal@gmail.com) / password123

## 🔒 Security

* Bcrypt password hashing
* Session-based auth (httpOnly cookies)
* Input validation & SQL injection protection
* Rate limiting + Helmet security headers


