# PocketFarm Backend

This is the backend API for the PocketFarm application, built with Flask.

## Deploying to Render with PostgreSQL

### Prerequisites

- A [Render](https://render.com/) account
- Your frontend application deployed (or ready to deploy)
- A PostgreSQL database set up on Render

### Step 1: Set Up PostgreSQL on Render (Already Done)

Since you mentioned you've already set up PostgreSQL on Render, you should have:
- A PostgreSQL database service running on Render
- The database connection URL in the format: `postgres://username:password@host:port/database`

### Step 2: Prepare Your Backend for Deployment

1. **Update Dependencies**
   Ensure your local repository has all the necessary updates we've made:
   - `database_config.py` - Handles database connections for both SQLite and PostgreSQL
   - `schema_postgres.sql` - Contains the PostgreSQL schema
   - `setup_postgres.py` - Script to migrate data from SQLite to PostgreSQL
   - Updated requirements.txt with psycopg2-binary

2. **Migrate Your Data**
   Run the migration script to transfer your existing SQLite data to PostgreSQL:

   ```bash
   cd Backend
   python setup_postgres.py
   ```

   This will:
   - Create tables in PostgreSQL
   - Transfer all data from your local SQLite database
   - Import any CSV data if present

### Step 3: Deploy to Render

1. **Push Changes to GitHub** (if using Git)
   ```bash
   git add .
   git commit -m "Prepare for PostgreSQL deployment on Render"
   git push
   ```

2. **Create a New Web Service on Render**:
   - Log in to your Render dashboard
   - Go to "Web Services" and click "New Web Service"
   - Connect your GitHub repository or use the public repo URL
   - Navigate through setup:
     - **Name**: Choose a name (e.g., "pocketfarm-backend")
     - **Environment**: Select "Python 3"
     - **Build Command**: `pip install -r requirements.txt`
     - **Start Command**: `gunicorn --worker-class eventlet -w 1 app:app`
     - **Plan**: Select the appropriate plan (Free tier is available)

3. **Set Environment Variables**:
   In the "Environment" tab of your web service settings, add these variables:
   
   ```
   ENVIRONMENT=production
   PORT=10000
   DATABASE_URL=[Your PostgreSQL database URL from Render]
   FRONTEND_URL=[Your frontend URL, e.g., https://pocketfarm-frontend.onrender.com]
   SECRET_KEY=[Generate a secure random string]
   OPENWEATHERMAP_API_KEY=[Your OpenWeather API key]
   EMAIL_USER=[Your email for sending notifications]
   EMAIL_PASSWORD=[Your email app password]
   GOOGLE_CLIENT_ID=[Your Google client ID]
   GOOGLE_CLIENT_SECRET=[Your Google client secret]
   ```

   **Important**: Make sure your DATABASE_URL is copied exactly from your Render PostgreSQL dashboard.

4. **Link Your Database**:
   - In your web service settings, go to the "Databases" tab
   - Select your PostgreSQL instance to link it directly to your service

5. **Deploy**:
   - Click "Deploy" to start the deployment process
   - Render will build and deploy your application
   - Monitor the logs for any issues during startup

### Step 4: Update Frontend Configuration

- Update your frontend application to point to your new Render backend URL
- This URL will be in the format: `https://pocketfarm-backend.onrender.com`

## Troubleshooting

### Database Connection Issues

- Verify your DATABASE_URL is correct in environment variables
- Check logs for connection errors
- Make sure PostgreSQL service is running
- Try connecting to the database manually using a tool like psql to verify credentials

### CORS Issues

- Verify that your `FRONTEND_URL` environment variable is set correctly
- Check browser console for CORS errors
- Ensure your frontend is making requests to the correct backend URL

### Data Migration Issues

- If you encounter issues migrating data, you can run the migration again
- For complex data issues, you may need to modify the migration script

### Server Startup Problems

- Check the logs for specific error messages
- Verify that all required environment variables are set
- Make sure you're using the correct start command

## Local Development

To run the backend locally (still connecting to PostgreSQL):

1. Copy `env_template` to `.env` and update with your Render PostgreSQL credentials
2. Install dependencies: `pip install -r requirements.txt`
3. Run the application: `python app.py`

## Database Management

### Backing Up PostgreSQL Data

Render's managed PostgreSQL includes automatic backups, but you can also:

1. Use pg_dump to create manual backups:
   ```bash
   pg_dump postgres://username:password@host:port/database > backup.sql
   ```

2. Schedule regular backups with Render's built-in backup tools

### Restoring Data

If you need to restore data to a clean database:

1. Run the setup_postgres.py script to create the schema
2. Use psql to restore a backup:
   ```bash
   psql postgres://username:password@host:port/database < backup.sql
   ```

## Security Notes

- Never commit `.env` files with sensitive information
- Rotate your SECRET_KEY regularly
- Use Render's environment variables for all secrets 