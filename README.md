# B8shield Reseller Portal

B8shield Reseller Portal is a web application for resellers to manage orders, track history, and handle customer information. It provides a comprehensive solution for order management with admin capabilities.

## Features

- User authentication and management
- Order creation and tracking
- Admin dashboard with statistics
- User role management (admin, reseller)
- Email notifications for order status changes

## Security Notice - API Keys

**IMPORTANT**: This project uses Firebase API keys which must be handled securely:

1. Never commit the actual API keys to Git or any public repository
2. Always use environment variables for storing sensitive credentials
3. The `.env` file is excluded from Git via `.gitignore`
4. Create your `.env` file based on `.env.example` with your own API keys
5. When deploying, set environment variables in your hosting platform

### Regenerating Compromised API Keys

If an API key has been compromised:

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Navigate to Project Settings > API keys
3. Regenerate the compromised key
4. Update your local `.env` file and any deployment environments
5. Verify your application still works with the new key

## Demo Mode

This application includes a demo mode for testing and exploration without requiring Firebase configuration:

1. When no valid Firebase API keys are provided, the app automatically runs in demo mode
2. Demo mode provides mock authentication (auto-login as admin)
3. Mock data for users and orders is pre-populated
4. All functionality works with the mock data

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/b8shield-portal.git
   cd b8shield-portal
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```
   cp .env.example .env
   ```

4. To run in demo mode, leave the Firebase configuration variables as they are in the example file.

   To connect to a real Firebase project:
   - Create a Firebase project at [firebase.google.com](https://firebase.google.com)
   - Enable Authentication, Firestore, and Storage
   - Add a web app to your Firebase project
   - Copy the configuration values to your `.env` file

5. Start the development server:
   ```
   npm run dev
   ```

6. Open your browser and navigate to `http://localhost:5173`

## Firebase Setup (for production use)

If you want to use this with a real Firebase project:

1. Create a Firebase project at [firebase.google.com](https://firebase.google.com)
2. Enable Authentication with Email/Password
3. Create a Firestore database
4. Add your Firebase configuration to `.env`
5. Deploy Firebase functions for email notifications
   ```
   firebase deploy --only functions
   ```

## Technologies Used

- React 18
- Firebase (Authentication, Firestore, Functions)
- Tailwind CSS
- Vite
- React Router
- React Hook Form

## License

This project is licensed under the MIT License - see the LICENSE file for details. 