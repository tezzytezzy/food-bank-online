# Food Bank Session Manager

A modern, offline-capable web application for managing food bank sessions, built with Next.js 16, Supabase, and Clerk.

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Clerk](https://img.shields.io/badge/Clerk-6C47FF?style=for-the-badge&logo=clerk&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)

## 📋 Overview

The **Food Bank Session Manager** streamlines the operations of food banks by providing robust tools for organisation management, session scheduling, and ticket distribution. Designed with a mobile-first approach, it features an offline mode that ensures critical check-in processes continue seamlessly, even in areas with poor internet connectivity.

This project was bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app) and leverages the latest web technologies to deliver a fast, reliable, and user-friendly experience.

## ✨ Features

-   **🔐 Secure Authentication**: Integrated with [Clerk](https://clerk.com/) for secure sign-in and organisation management.
-   **🏢 Organisation Management**: Create and manage food bank organisations and team members with role-based access.
-   **📅 Session Scheduling**: Easily schedule upcoming food distribution sessions and manage recurring events via templates.
-   **🎟️ Ticket System**: scalable and flexible ticketing.
    -   **PDF Generation**: Batch generate printable tickets with QR codes.
    -   **Offline Scanning**: Scan attendee tickets using the built-in PWA scanner, which caches data locally in IndexedDB.
-   **📱 Mobile First & PWA**: Fully responsive design that can be installed on mobile devices for a native app-like experience.
-   **⚡ Real-time Updates**: Syncs data in real-time using [Supabase](https://supabase.com/) when online.

## 🛠️ Tech Stack

-   **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
-   **Database**: [Supabase](https://supabase.com/) (PostgreSQL)
-   **Auth**: [Clerk](https://clerk.com/)
-   **Offline Storage**: [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) (via `idb`)
-   **Utilities**:
    -   `pdf-lib` for generating PDF tickets
    -   `qrcode` & `html5-qrcode` for QR code generation and scanning
    -   `lucide-react` for beautiful icons

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine.

### Prerequisites

Ensure you have the following installed:

-   [Node.js](https://nodejs.org/) (v18 or later recommended)
-   npm, yarn, pnpm, or bun

### Installation

1.  **Clone the repository**

    ```bash
    git clone <your-repo-url>
    cd antigravity-gemini-led-prompt
    ```

2.  **Install dependencies**

    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    # or
    bun install
    ```

3.  **Environment Setup**

    Create a `.env.local` file in the root directory and add your Clerk and Supabase keys:

    ```bash
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
    CLERK_SECRET_KEY=sk_test_...

    NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
    ```
    *Note: You will need to set up a Clerk application and a Supabase project to obtain these keys.*

4.  **Run the Development Server**

    ```bash
    npm run dev
    # or
    yarn dev
    # or
    pnpm dev
    # or
    bun dev
    ```

    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📖 Usage

### Dashboard

Access the dashboard to manage your organisation. Here you can:
-   View upcoming sessions.
-   Create and edit session templates.
-   Manage team members.

### Scanner

The scanner is designed for on-site use. Navigate to the scanner section on a mobile device to check in attendees. The app caches ticket data for offline use, syncing back to the server automatically when the connection is restored. This ensures that food distribution can continue without interruption.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the project
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
