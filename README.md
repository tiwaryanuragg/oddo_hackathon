# AssetFlow — Enterprise Asset & Resource Management System

AssetFlow is a centralized, digital ERP platform designed to simplify how organizations track, allocate, and maintain physical assets (like laptops, phones, furniture) and shared resources. 

The platform aims to replace manual spreadsheets with a modern web application featuring structured asset lifecycles, real-time tracking, peer-to-peer asset transfers, and strict Role-Based Access Control (RBAC).

## Features
- **Asset Directory**: Track what you own, its condition, and its current value.
- **Allocations & Transfers**: Assign assets to employees or let employees request assets from each other (or the available pool) through a secure approval pipeline.
- **Resource Booking**: Reserve shared resources (e.g. conference rooms, projectors) by the hour or day.
- **Maintenance**: Kanban-style workflow for managing broken equipment and tracking repair progress.
- **Role-Based Access Control (RBAC)**: Secure access tailored for Employees, Department Heads, Asset Managers, and Administrators.

## Tech Stack
- **Frontend**: Next.js (App Router), React, Tailwind CSS
- **Backend**: Next.js API Routes (Serverless)
- **Database**: MongoDB (via Mongoose)
- **Authentication**: NextAuth.js

---

## Local Development (Running it on your machine)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up Environment Variables:**
   Create a `.env.local` file in the root directory and add the following keys. You will need a MongoDB URI (you can get a free cluster at [MongoDB Atlas](https://www.mongodb.com/atlas/database)).
   
   ```env
   MONGODB_URI="mongodb+srv://<username>:<password>@cluster0...mongodb.net/assetflow?retryWrites=true&w=majority"
   NEXTAUTH_SECRET="a_random_development_secret_key_12345"
   NEXTAUTH_URL="http://localhost:3000"
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Deployment Guide (Vercel)

The easiest way to deploy this application to production so anyone can access it is via **Vercel**, the company behind Next.js.

### 1. Push Code to GitHub
Push your local code to a GitHub repository:
```bash
git add .
git commit -m "Ready for production"
git push origin main
```

### 2. Import into Vercel
1. Go to [Vercel.com](https://vercel.com/) and create a free account linked to your GitHub.
2. Click **Add New... -> Project**.
3. Import the `assetflow` GitHub repository you just created.

### 3. Add Environment Variables (IMPORTANT)
Before clicking "Deploy", expand the **Environment Variables** section and add these three exact variables:

| Name | Value | Note |
|---|---|---|
| `MONGODB_URI` | `mongodb+srv://...` | *Paste your exact MongoDB URI string from your `.env.local`.* |
| `NEXTAUTH_SECRET` | `generate_a_secure_string` | *Use a highly secure, random string. Do NOT use the dev secret.* |
| `NEXTAUTH_URL` | `https://your-project.vercel.app` | *Put the production URL of your app here.* |

### 4. Deploy
Click the **Deploy** button. Vercel will build the application and provide you with a live URL within minutes! Every time you push new code to your GitHub `main` branch, Vercel will automatically redeploy it for you.
