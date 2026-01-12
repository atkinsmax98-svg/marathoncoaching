# Running Coach App

A marathon coaching application to manage athletes, schedule training runs, and track progress with Garmin integration.

## Features

- **Coach Dashboard**: View all athletes and their training progress
- **Athlete Dashboard**: See scheduled runs and weekly stats
- **Calendar View**: Outlook-style calendar with drag-and-drop scheduling
- **Run Management**: Add, edit, delete runs with run type categorization
- **Athlete Invites**: Invite athletes via email link
- **Garmin Integration**: Connect Garmin accounts to sync weekly stats (mock data for demo)

## Tech Stack

- **Frontend**: React 18 + Vite + react-big-calendar
- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **Auth**: JWT-based authentication

## Quick Start

### Prerequisites

- Node.js 18+
- Docker (for PostgreSQL)

### 1. Start the Database

```bash
cd running-coach-app
docker-compose up -d
```

This starts PostgreSQL on port 5432.

### 2. Set Up the Server

```bash
cd server
npm install
npm run db:init   # Creates database tables
npm run dev       # Starts server on http://localhost:3001
```

### 3. Set Up the Client

```bash
cd client
npm install
npm run dev       # Starts React app on http://localhost:5173
```

### 4. Open the App

Visit http://localhost:5173

## Usage

### As a Coach

1. Register a new account (first user is automatically a coach)
2. Go to **Athletes** > **Invite Athlete** to invite your athletes
3. Share the invite link with your athlete
4. Go to **Calendar** to schedule training runs
5. Click any date to add a run, or click existing runs to edit

### As an Athlete

1. Use the invite link from your coach to register
2. View your scheduled runs on the **Dashboard** or **Calendar**
3. Click a run to mark it as completed
4. Go to **Settings** to connect your Garmin account

## Run Types

- **Easy** (Green): Recovery pace runs
- **Tempo** (Yellow): Threshold pace runs
- **Interval** (Orange): Speed work
- **Long** (Blue): Weekly long runs
- **Recovery** (Purple): Active recovery
- **Race** (Red): Race day

## API Endpoints

### Auth
- `POST /api/auth/register` - Register as coach
- `POST /api/auth/register/athlete` - Register with invite token
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Runs
- `GET /api/runs` - Get runs (filtered by date range/athlete)
- `POST /api/runs` - Create run (coach only)
- `PUT /api/runs/:id` - Update run
- `DELETE /api/runs/:id` - Delete run (coach only)

### Athletes
- `GET /api/athletes` - Get coach's athletes
- `GET /api/athletes/:id` - Get athlete details
- `DELETE /api/athletes/:id` - Remove athlete from team

### Invites
- `POST /api/invites` - Create invite (coach only)
- `GET /api/invites` - List pending invites
- `GET /api/invites/verify/:token` - Verify invite token

### Garmin
- `GET /api/garmin/status` - Get connection status
- `POST /api/garmin/connect` - Connect Garmin (mock)
- `POST /api/garmin/disconnect` - Disconnect Garmin
- `GET /api/garmin/stats/weekly` - Get weekly stats
- `POST /api/garmin/sync` - Sync runs to Garmin (mock)
- `POST /api/garmin/refresh` - Refresh stats from Garmin (mock)

## Environment Variables

### Server (.env)

```
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=running_coach
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=your-super-secret-jwt-key
```

## Project Structure

```
running-coach-app/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── contexts/       # Auth context
│   │   ├── pages/          # Page components
│   │   └── services/       # API client
│   └── package.json
├── server/                 # Express backend
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Auth middleware
│   │   ├── services/       # Garmin mock service
│   │   └── db/             # Database config
│   └── package.json
├── docker-compose.yml      # PostgreSQL container
└── README.md
```

## Notes

- Garmin integration uses mock data. To use real Garmin API, register at https://developer.garmin.com and implement OAuth 1.0a flow.
- For production, update JWT_SECRET and database credentials.
