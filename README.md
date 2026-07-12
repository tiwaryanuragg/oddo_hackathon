# AssetFlow - Odoo Hackathon

Backend API for the AssetFlow enterprise asset and resource management system.

## Tech Stack

- Node.js + Express
- MongoDB + Mongoose
- JWT auth

## Quick Start

1. Install dependencies:

	npm install

2. Create env file at server/.env:

	MONGO_URI=mongodb://127.0.0.1:27017/assetflow
	JWT_SECRET=replace-with-strong-secret
	PORT=5000

3. Seed sample data:

	npm run seed --prefix server

4. Start API:

	npm run dev --prefix server

## API Base

- Base URL: /api
- Health: GET /api/health
- Standalone frontend: frontend/index.html

## Implemented Modules

- Auth: signup, login, me, forgot password, reset password
- Organization Setup: departments, categories, employee directory + role assignment
- Assets: register, list, detail, update
- Allocation & Transfer: allocate, return, transfer request + approval
- Resource Booking: list, day availability, create with conflict checks, cancel
- Maintenance Workflow: request, approve/reject, technician assignment, status progression
- Audit Workflow: start cycle, verify assets, close with discrepancy count
- Reports: utilization, maintenance frequency, most-used assets, idle assets, near-retirement, booking heatmap, audit discrepancies
- Dashboard, notifications, activity logs

## Notes

- Signup always creates employee role.
- Role changes are admin-only through organization employee update.
- Transfer flow enforces the double-allocation block by design.
- Forgot password currently returns a reset token in API response for hackathon/demo use; replace with email delivery in production.
- Seed now includes realistic demo data across booking, maintenance, transfer, audit, notifications, and activity logs.

## End-to-End Run

1. Start MongoDB locally.
2. Seed backend data:

	npm run seed --prefix server

3. Run backend API:

	npm run dev --prefix server

4. Run frontend in a second terminal:

	cd frontend && python3 -m http.server 5173

5. Open:

	http://localhost:5173

6. Demo accounts (seeded, password: password123):

	- admin@assetflow.com
	- manager@assetflow.com
	- aditi@assetflow.com
	- priya@assetflow.com
