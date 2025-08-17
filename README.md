# Mosque Services App

A React Native + Firebase app for connecting service providers within mosque communities. Built with Expo managed workflow for easy development and deployment.

## Features

- **Phone Number Authentication**: Users sign up with name, phone, and password
- **Service Listings**: Each user can offer up to 3 services from a curated catalog
- **Real-time Search**: Find service providers using typeahead search
- **In-app Notifications**: Get notified when someone is interested in your services
- **Activity Tracking**: Track profile views and contact requests
- **Clean UI**: Material Design with mosque-themed green/white colors

## Tech Stack

- **Frontend**: React Native with Expo managed workflow
- **Backend**: Firebase (Authentication + Firestore)
- **UI Library**: React Native Paper
- **Navigation**: React Navigation 6
- **State Management**: React Hooks + Context

## Prerequisites

Before you begin, ensure you have:

- Node.js 16+ installed
- npm or yarn package manager
- Expo CLI: `npm install -g @expo/cli`
- EAS CLI: `npm install -g eas-cli`
- Android Studio (for Android development)
- A Firebase project with Authentication and Firestore enabled

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd mosque-services-app
npm install
