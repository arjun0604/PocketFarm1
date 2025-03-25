# PocketFarm Backend

This is the backend API for the PocketFarm application, built with Flask.

## Deploying to Render

### Prerequisites

- A [Render](https://render.com/) account
- Your frontend application deployed (or ready to deploy)

### Deployment Steps

1. **Log in to Render**:
   - Go to [render.com](https://render.com/) and sign in or create an account

2. **Create a New Web Service**:
   - Click on "New" and select "Web Service"
   - Connect your GitHub repository or use the public repo URL

3. **Configure the Web Service**:
   - **Name**: Choose a name for your service (e.g., "pocketfarm-backend")
   - **Environment**: Select "Python 3"
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn --worker-class eventlet -w 1 app:app`
   - **Plan**: Select the appropriate plan (Free tier is available)

4. **Set Environment Variables**:
   Add the following environment variables:
   
   ```
   ENVIRONMENT=production
   PORT=10000
   FRONTEND_URL=[Your frontend URL, e.g., https://pocketfarm-frontend.onrender.com]
   SECRET_KEY=[Generate a secure random string]
   OPENWEATHERMAP_API_KEY=[Your OpenWeather API key]
   EMAIL_USER=[Your email for sending notifications]
   EMAIL_PASSWORD=[Your email app password]
   GOOGLE_CLIENT_ID=[Your Google client ID]
   GOOGLE_CLIENT_SECRET=[Your Google client secret]
   ```

5. **Upload Database**:
   - Render provides a persistent disk option that you can enable in your service settings.
   - Set the `DATABASE_URL` environment variable to point to this location, e.g., `/var/data/PocketFarm.db`

6. **Deploy**:
   - Click "Create Web Service"
   - Render will build and deploy your application

7. **Update Frontend Configuration**:
   - Update your frontend application's API URL to point to your new Render backend URL

## Monitoring and Maintenance

- Monitor your application logs in the Render dashboard
- You can set up health checks through Render to ensure your application stays online
- For database backups, consider setting up a scheduled task to export your database regularly

## Troubleshooting

- If you encounter CORS issues, verify that your `FRONTEND_URL` environment variable is set correctly
- Check the logs for any startup errors or runtime issues
- Make sure all required environment variables are set correctly

## Local Development

To run the backend locally:

1. Install dependencies: `pip install -r requirements.txt`
2. Set up your `.env` file with required environment variables
3. Run the application: `python app.py` 