# Render Deployment Guide

This guide will help you deploy HotelFlow to Render.

## Prerequisites

1. A Render account (sign up at https://render.com)
2. Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)

## Deployment Steps

### Option 1: Using render.yaml (Recommended)

1. **Push your code to Git** - Make sure `render.yaml` is in your repository root

2. **Create a new Web Service on Render:**
   - Go to your Render dashboard
   - Click "New +" → "Blueprint"
   - Connect your Git repository
   - Render will automatically detect `render.yaml` and create the services

3. **The render.yaml will:**
   - Create a PostgreSQL database
   - Create a web service
   - Link them together automatically
   - Set up environment variables

### Option 2: Manual Setup

1. **Create a PostgreSQL Database:**
   - Go to Render dashboard → "New +" → "PostgreSQL"
   - Name it `hotelflow-db`
   - Note the connection string (you'll need it later)

2. **Create a Web Service:**
   - Go to "New +" → "Web Service"
   - Connect your Git repository
   - Use these settings:
     - **Name:** `hotelflow`
     - **Environment:** `Node`
     - **Build Command:** `npm install && npm run build`
     - **Start Command:** `npm start`
     - **Environment Variables:**
       - `NODE_ENV` = `production`
       - `DATABASE_URL` = (from your PostgreSQL database - Internal Database URL)
       - `DATABASE_SSL` = `true`
       - `PORT` = (automatically set by Render)

3. **Run Database Migrations:**
   - After the first deployment, you may need to run migrations
   - You can do this via Render's Shell or by adding a one-time script
   - Or run `npm run db:push` manually after deployment

## Important Notes

- **Database Migrations:** The `db:push` command is now separate from the build process. Run it after deployment or set up a one-time script.
- **Environment Variables:** Make sure `DATABASE_URL` is set to your Render PostgreSQL database connection string.
- **SSL:** Render's PostgreSQL requires SSL, which is automatically enabled for non-localhost connections.
- **Port:** Render automatically sets the `PORT` environment variable - your app will use it automatically.

## Troubleshooting

### Build Fails
- Check that all dependencies are in `package.json`
- Ensure Node.js version is compatible (check `package.json` engines if specified)

### Database Connection Fails
- Verify `DATABASE_URL` is set correctly
- Check that the database is created and running
- Ensure `DATABASE_SSL=true` is set (or let it auto-detect)

### Static Files Not Loading
- Verify the build completed successfully
- Check that `dist/public` directory exists after build
- Ensure the static file path is correct in production

### App Crashes on Startup
- Check Render logs for error messages
- Verify all environment variables are set
- Ensure database is accessible from the web service

## Post-Deployment

After successful deployment:

1. **Run Database Migrations:**
   ```bash
   npm run db:push
   ```
   (You can do this via Render's Shell feature)

2. **Verify the app is running:**
   - Visit your Render-provided URL
   - Test the login/register functionality
   - Check that the database connection is working

3. **Set up Custom Domain (Optional):**
   - In your Render service settings
   - Add your custom domain
   - Render will provide DNS instructions

