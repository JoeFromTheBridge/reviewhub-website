# ReviewHub Deployment Guide: Netlify, GitHub, and Gitpod

This guide will walk you through setting up and deploying your ReviewHub project using GitHub for version control, Gitpod for cloud-based development, and Netlify for continuous deployment of the frontend.

## Prerequisites

Before you begin, ensure you have:

1.  A GitHub account.
2.  A Netlify account.
3.  A Gitpod account (optional, but highly recommended for cloud development).
4.  The `reviewhub-enhanced-complete.zip` file containing your project code.

---

## 1. GitHub Setup (Version Control)

GitHub will host your project's code, allowing for version control, collaboration, and easy integration with deployment services like Netlify.

### 1.1 Create a New GitHub Repository

1.  Go to [GitHub](https://github.com/) and log in to your account.
2.  Click the `+` icon in the top right corner and select `New repository`.
3.  **Repository name**: Choose a descriptive name (e.g., `reviewhub-frontend` for the React app, `reviewhub-backend` for the Flask app, and `reviewhub-mobile` for the React Native app).
4.  **Description**: (Optional) Add a brief description of your project.
5.  **Visibility**: Choose `Public` or `Private` based on your preference.
6.  **Initialize this repository with**: **Do NOT** check 


`.gitignore` or `LICENSE` at this stage, as you will be pushing existing code.
7.  Click `Create repository`.

### 1.2 Upload Your Existing Code to GitHub

For each part of your project (frontend, backend, mobile), you will create a separate repository and push the respective code.

**General Steps for Each Repository:**

1.  **Unzip the Project**: Extract the `reviewhub-enhanced-complete.zip` file to a local directory.
2.  **Navigate to Project Folder**: Open your terminal or command prompt and navigate to the specific project folder (e.g., `/home/ubuntu/reviewhub` for the frontend, `/home/ubuntu/reviewhub-backend` for the backend, `/home/ubuntu/reviewhub-mobile` for the mobile app).
3.  **Initialize Git**: If not already initialized, run:
    ```bash
    git init
    ```
4.  **Add Remote Origin**: Link your local repository to the GitHub repository you just created. Replace `<YOUR_GITHUB_USERNAME>` and `<YOUR_REPO_NAME>` with your actual details:
    ```bash
    git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPO_NAME>.git
    ```
5.  **Add Files**: Stage all your project files for the first commit:
    ```bash
    git add .
    ```
6.  **Commit Changes**: Commit the staged files with a message:
    ```bash
    git commit -m "Initial commit of ReviewHub <Frontend/Backend/Mobile>"
    ```
7.  **Push to GitHub**: Push your local commits to the GitHub repository. You might need to specify the branch name (e.g., `main` or `master`):
    ```bash
    git push -u origin main
    ```
    *   If you encounter authentication issues, GitHub might prompt you to use a Personal Access Token (PAT). Follow GitHub's instructions to generate one.

**Repeat these steps for your `reviewhub`, `reviewhub-backend`, and `reviewhub-mobile` directories, creating a separate GitHub repository for each.**

---

## 2. Gitpod Setup (Cloud Development Environment)

Gitpod provides ready-to-code development environments in the cloud, integrated with GitHub. This is particularly useful for collaborating or developing without local setup.

### 2.1 Install Gitpod Browser Extension (Optional but Recommended)

1.  Go to the [Gitpod website](https://www.gitpod.io/).
2.  Install the Gitpod browser extension for Chrome or Firefox. This adds a 


`Gitpod` button on your GitHub repositories.

### 2.2 Open Your Project in Gitpod

1.  **From GitHub**: Navigate to one of your ReviewHub repositories on GitHub (e.g., `reviewhub-frontend`). Click the `Gitpod` button (if you installed the extension) or prefix the GitHub URL with `gitpod.io/#` (e.g., `gitpod.io/#https://github.com/<YOUR_GITHUB_USERNAME>/reviewhub-frontend`).
2.  **From Gitpod Dashboard**: Go to your [Gitpod Dashboard](https://gitpod.io/workspaces) and click `New Workspace`. Select your GitHub repository.

Gitpod will provision a new workspace, clone your repository, and open it in a VS Code-like environment in your browser.

### 2.3 Configure Gitpod (Optional: `.gitpod.yml`)

For a more consistent and automated setup, you can add a `.gitpod.yml` file to the root of each of your repositories. This file tells Gitpod how to configure your workspace.

**Example `.gitpod.yml` for `reviewhub-frontend` (React App):**

```yaml
# .gitpod.yml for reviewhub-frontend
tasks:
  - name: Install Dependencies
    init: npm install
    command: npm start
ports:
  - port: 3000
    onOpen: open-preview
```

**Example `.gitpod.yml` for `reviewhub-backend` (Flask App):**

```yaml
# .gitpod.yml for reviewhub-backend
tasks:
  - name: Install Dependencies
    init: pip install -r requirements.txt
    command: python run_server.py
ports:
  - port: 5000
    onOpen: open-preview
```

After adding and committing these `.gitpod.yml` files to their respective repositories, every new Gitpod workspace opened for that project will automatically install dependencies and start the application.

---

## 3. Netlify Setup (Frontend Deployment)

Netlify provides continuous deployment for your frontend (React) application directly from your GitHub repository. Every time you push changes to your `main` branch, Netlify will automatically build and deploy your site.

### 3.1 Connect Netlify to Your GitHub Repository

1.  Go to [Netlify](https://www.netlify.com/) and log in to your account.
2.  Click `Add new site` -> `Import an existing project`.
3.  Select `Deploy with GitHub`.
4.  Authorize Netlify to access your GitHub account if you haven't already.
5.  Search for and select your `reviewhub-frontend` repository.

### 3.2 Configure Your Netlify Site

On the `Deploy settings` page, configure the following:

1.  **Owner**: Your Netlify team or personal account.
2.  **Branch to deploy**: `main` (or `master`, depending on your repository).
3.  **Basic build settings**:
    *   **Build command**: `npm run build`
    *   **Publish directory**: `build` (This is the default output directory for React apps created with Create React App. If you used a different setup or changed the output, adjust accordingly).
4.  **Advanced build settings (Optional)**:
    *   **New environment variable**: You might need to set environment variables for your React app, especially if it connects to your backend API. For example, `REACT_APP_API_BASE_URL` pointing to your deployed Flask backend URL.
        *   **Key**: `REACT_APP_API_BASE_URL`
        *   **Value**: `https://your-backend-api-url.com/api` (Replace with your actual backend URL once deployed).

5.  Click `Deploy site`.

Netlify will now start building and deploying your React application. Once deployed, it will provide you with a unique URL (e.g., `https://your-site-name.netlify.app`). You can customize this domain later.

### 3.3 Continuous Deployment

After the initial setup, Netlify will automatically rebuild and redeploy your site every time you push new commits to the `main` branch of your `reviewhub-frontend` GitHub repository.

---

## 4. Backend Deployment (Flask App)

Deploying the Flask backend requires a different approach, as Netlify is primarily for static sites and serverless functions. You can deploy your Flask app to a cloud provider like Heroku, Render, AWS EC2, Google Cloud Run, or use Docker.

**General Steps (Example using Docker and a VPS/Cloud Run):**

1.  **Containerize your Flask App**: Ensure your `reviewhub-backend` directory contains a `Dockerfile` and `docker-compose.yml` (if using Docker Compose) for easy deployment.
    *   **`Dockerfile` example:**
        ```dockerfile
        # syntax=docker/dockerfile:1
        FROM python:3.9-slim-buster
        WORKDIR /app
        COPY requirements.txt requirements.txt
        RUN pip install --no-cache-dir -r requirements.txt
        COPY . .
        CMD ["python", "run_server.py"]
        ```
    *   **`run_server.py` (ensure it binds to 0.0.0.0):**
        ```python
        # ... (your existing Flask app setup)
        if __name__ == '__main__':
            app.run(host=\'0.0.0.0\', port=5000, debug=False)
        ```

2.  **Choose a Deployment Platform**: 
    *   **Heroku**: Simple for small apps, but might have limitations.
    *   **Render.com**: Good for web services, databases, and cron jobs.
    *   **Google Cloud Run / AWS Fargate**: Serverless container platforms, scalable and cost-effective.
    *   **DigitalOcean Droplet / AWS EC2**: A virtual private server (VPS) where you have full control.

3.  **Deploy**: The deployment steps will vary significantly based on your chosen platform. Generally, it involves:
    *   Building your Docker image.
    *   Pushing the image to a container registry (e.g., Docker Hub, Google Container Registry).
    *   Deploying the container to your chosen platform.
    *   Configuring environment variables (e.g., `DATABASE_URL`, `SECRET_KEY`, `MAIL_USERNAME`, `AWS_ACCESS_KEY_ID`, etc.) on the deployment platform.

**Important**: Once your backend is deployed, update the `REACT_APP_API_BASE_URL` environment variable in your Netlify site settings (and in your mobile app code) to point to the live URL of your Flask backend.

---

## 5. Mobile App Deployment (React Native)

Deploying a React Native app involves building platform-specific binaries (APK for Android, IPA for iOS) and submitting them to app stores (Google Play Store, Apple App Store).

### 5.1 Build for Android

1.  **Prerequisites**: Ensure you have Android Studio, Java Development Kit (JDK), and Android SDK installed and configured.
2.  **Generate Keystore**: Create a signing keystore for your app.
3.  **Configure `android/app/build.gradle`**: Add signing configurations.
4.  **Build Release APK/AAB**: 
    ```bash
    cd reviewhub-mobile/android
    ./gradlew assembleRelease
    # or for AAB (recommended for Play Store)
    ./gradlew bundleRelease
    ```
5.  **Upload to Google Play Console**: Follow the instructions on the Google Play Console to create a new app, upload your AAB, and release it.

### 5.2 Build for iOS

1.  **Prerequisites**: You need a macOS machine with Xcode installed and an Apple Developer Program enrollment.
2.  **Configure Xcode Project**: Open `reviewhub-mobile/ios/reviewhub.xcworkspace` in Xcode.
3.  **Signing & Capabilities**: Configure signing with your Apple Developer account and add necessary capabilities.
4.  **Build Archive**: In Xcode, select `Product` -> `Archive`.
5.  **Distribute App**: Use Xcode Organizer to distribute your app to App Store Connect.
6.  **Upload to App Store Connect**: Follow the instructions on App Store Connect to submit your app for review.

**Important**: Remember to update the API base URL in your mobile app's `apiService.js` to point to your deployed Flask backend URL.

---

This guide provides a high-level overview. Each deployment step can be complex and may require consulting specific documentation for your chosen platforms and tools. Good luck!

