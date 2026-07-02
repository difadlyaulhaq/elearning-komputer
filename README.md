# Alfajr E-Learning

A comprehensive E-Learning management system built with **Next.js 16 (App Router)** and **Capacitor**, optimized for both web and mobile experiences.

## 🚀 Overview

Alfajr E-Learning provides a seamless educational platform with advanced video protection, progress tracking, and an intuitive administrative interface. It's designed to be used as a progressive web app and a native mobile application (Android).

## 🛠 Tech Stack

- **Frontend**: [Next.js](https://nextjs.org/) (App Router, React 19)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Mobile SDK**: [Capacitor](https://capacitorjs.com/) (Android)
- **Backend**: [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- **Database & Auth**: [Firebase](https://firebase.google.com/) (Firestore & Authentication)
- **Storage & CDN**: [Bunny.net](https://bunny.net/) (Secure Asset & Video Hosting)
- **Video Player**: [Plyr](https://plyr.io/) (via `plyr-react`)
- **UI Components**: Headless UI, Radix UI, Lucide Icons

## 📱 Key Features

- **Multi-Module Interface**: Dedicated dashboards for Admin and Learning (Employee/Student).
- **Advanced Video Player**: Supports YouTube embeds and direct video uploads with custom watermark overlays.
- **Progress Tracking**: Real-time progress updates and completion reporting.
- **Mobile Protection**: Native screen protection (anti-screenshot/recording) via Capacitor plugins.
- **PWA Ready**: Optimized for installation on mobile devices with native-like features.

## 📂 Project Structure

See [STRUCTURE.md](./STRUCTURE.md) for a detailed breakdown of the codebase and architecture.

## ⚙️ Getting Started

### Prerequisites

- Node.js (Latest LTS)
- npm or yarn
- Android Studio (for mobile development)

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd alfajr-elearning
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Variables**:
   Create a `.env.local` (and production `.env`) file in the root directory and add the necessary configuration:
   ```env
   # Firebase Web Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

   # Firebase Admin Configuration (Server Side)
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_CLIENT_EMAIL=your_client_email
   FIREBASE_PRIVATE_KEY="your_private_key"

   # Bunny.net Storage & CDN Configuration
   BUNNY_STORAGE_ZONE_NAME=your_storage_zone_name
   BUNNY_STORAGE_ACCESS_KEY=your_bunny_access_key
   BUNNY_STORAGE_REGION=storage.bunnycdn.com
   BUNNY_CDN_HOSTNAME=your_pull_zone.b-cdn.net
   ```

### Development

Run the development server:
```bash
npm run dev
```

### Mobile Build (Android)

1. **Build the Next.js project**:
   ```bash
   npm run build
   ```

2. **Sync with Capacitor**:
   ```bash
   npx cap sync
   ```

3. **Open in Android Studio**:
   ```bash
   npx cap open android
   ```

## 🛡 Security & Protection

This project implements several layers of content protection:
- **Server-side Session Handling**: Secure authentication using Firebase Admin.
- **Watermarking**: Dynamic user identity overlays on video playback.
- **Screen Protection**: Blocking screenshots and screen recordings on native Android devices.
- **PWA Enforcement**: Redirecting web users to install or use the app for a secure environment.

---

© 2026 Alfajr E-Learning. All rights reserved.
