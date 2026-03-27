# RationsWeb

## Project Structure

This repository contains the source code for the RationsWeb platform, organized into three separate projects:

- **`admin/`**: The Admin Dashboard (React + Vite).
- **`client/`**: The Customer-Facing Web App (React + Vite).
- **`server/`**: The Backend API (Node.js + Express).

## Deployment

Each project is designed to be deployed separately on Vercel.

### 1. Server (`/server`)
- **Type**: Node.js / Express (Serverless compatible).
- **Environment Variables**:
  - `MONGODB_URI`: Connection string for MongoDB.
  - `CLIENT_ORIGINS`: Comma-separated list of allowed origins (e.g., `https://your-client.vercel.app,https://your-admin.vercel.app`).
  - `JWT_SECRET`, `JWT_REFRESH_SECRET`, etc.
- **Vercel Config**: `vercel.json` is included to route traffic to the API.

### 2. Admin (`/admin`)
- **Type**: Vite (React).
- **Environment Variables**:
  - `VITE_RATIONSWEB_API_URL`: The URL of the deployed Server (e.g., `https://your-server.vercel.app`).

### 3. Client (`/client`)
- **Type**: Vite (React).
- **Environment Variables**:
  - `VITE_RATIONSWEB_API_URL`: The URL of the deployed Server.

## Local Development

1. **Server**:
   ```bash
   cd server
   npm install
   npm run dev
   ```

2. **Admin**:
   ```bash
   cd admin
   npm install
   npm run dev
   ```

3. **Client**:
   ```bash
   cd client
   npm install
   npm run dev
   ```
