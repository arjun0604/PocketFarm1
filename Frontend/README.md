# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/8b895241-3671-4036-b77b-0203cb70ad56

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/8b895241-3671-4036-b77b-0203cb70ad56) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with .

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/8b895241-3671-4036-b77b-0203cb70ad56) and click on Share -> Publish.

## I want to use a custom domain - is that possible?

We don't support custom domains (yet). If you want to deploy your project under your own domain then we recommend using Netlify. Visit our docs for more details: [Custom domains](https://docs.lovable.dev/tips-tricks/custom-domain/)

# PocketFarm Frontend

This is the frontend application for PocketFarm, built with React, TypeScript, and Vite.

## Deploying to Vercel

### Prerequisites

- A [Vercel](https://vercel.com/) account
- The PocketFarm backend already deployed at https://pocketfarm1.onrender.com

### Deployment Steps

1. **Prepare Your Project for Deployment**

   We've already configured the necessary files:
   - `src/config.ts` - Contains environment-specific configuration
   - `vercel.json` - Vercel-specific configuration for routing and headers

2. **Deploy to Vercel**

   **Option 1: Deploy from GitHub**
   
   a. Push your changes to GitHub:
   ```bash
   git add .
   git commit -m "Prepare frontend for Vercel deployment"
   git push
   ```
   
   b. Login to Vercel and import your repository:
   - Go to https://vercel.com/new
   - Select your GitHub repository
   - Vercel will detect the project as a Vite app
   - In the "Build and Output Settings", confirm:
     - Build Command: `npm run build`
     - Output Directory: `dist`
   - Click "Deploy"

   **Option 2: Deploy using Vercel CLI**
   
   a. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```
   
   b. Navigate to your frontend directory and deploy:
   ```bash
   cd Frontend
   vercel
   ```
   
   c. Follow the CLI prompts to complete the deployment

3. **Verify the Deployment**

   Once deployed, Vercel will provide you with a URL (e.g., `https://pocketfarm-xyz.vercel.app`).
   
   - Visit this URL to confirm the application is working correctly
   - Test key features like user registration, crop recommendations, etc.
   - Check browser console for any API connectivity issues

4. **Custom Domain (Optional)**

   If you have a custom domain:
   - In Vercel dashboard, go to your project settings
   - Navigate to "Domains" section
   - Add your custom domain and follow the DNS configuration instructions

## Troubleshooting

### CORS Issues

If you're experiencing CORS errors:

1. Verify the backend at https://pocketfarm1.onrender.com has the correct CORS settings:
   - The `FRONTEND_URL` environment variable should be set to your Vercel URL
   - The CORS configuration should allow your Vercel domain

2. Check network requests in the browser developer tools:
   - Look for failed requests with CORS errors
   - Verify the request headers include the proper Origin

### API Connection Issues

If the app can't connect to the backend:

1. Confirm the API is working by visiting https://pocketfarm1.onrender.com in a browser
2. Check that `src/config.ts` has the correct production URL
3. Verify the network requests in the browser developer tools

### Environment Variables

If needed, you can add environment variables in Vercel:
- Go to your project in the Vercel dashboard
- Navigate to "Settings" > "Environment Variables"
- Add any required variables like `VITE_API_URL` if you want to override config.ts

## Local Development

To run the frontend locally:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser to http://localhost:8080
