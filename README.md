# P&L Calendar - Trading Performance Tracker

A beautiful, modern web application for tracking your trading performance with an interactive calendar, comprehensive analytics, and persistent cloud storage.

## Features

### 📅 Interactive Calendar
- Monthly calendar view starting from September 2025
- Color-coded days: Green (profit), Red (loss), Yellow (neutral)
- Click any day to add/edit trading data
- View trades, P&L, tags, and notes at a glance

### 📊 Comprehensive Analytics
- **Core Metrics**: Win Rate, Average Return, Max Drawdown, Profit Factor, Sharpe Ratio
- **Cumulative P&L Curve**: Track your account growth over time
- **Daily P&L Chart**: Visualize daily performance
- **P&L by Ticker**: See which stocks are most profitable
- **P&L by Day of Week**: Identify your best trading days
- **Return Distribution**: Histogram of trade returns

### 💾 Data Persistence
- Cloud storage with Firebase Firestore
- Data never lost - survives cache clears, browser changes, device switches
- Single-user password protection

### 📝 Detailed Trade Tracking
- Total P&L per day
- Multiple trades per day with symbols and % returns
- Custom notes for each day
- Tagging system (Blue Chip Scalp, Momentum, Dip Buy, etc.)
- Trade count tracking

### 💰 Portfolio Management
- Real-time cumulative P&L calculation
- Account net worth tracking
- Starting balance reference
- Quick stats sidebar

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Database**: Firebase Firestore
- **Icons**: Lucide React
- **Deployment**: Netlify

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Firebase account (free tier is sufficient)

### Installation

1. Clone the repository:
```bash
cd plcalendar
```

2. Install dependencies:
```bash
npm install
```

3. Set up Firebase (see [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for detailed instructions):
   - Create a Firebase project
   - Enable Firestore Database
   - Copy your Firebase config
   - Update `src/firebase.ts` with your credentials

4. Start the development server:
```bash
npm run dev
```

5. Open http://localhost:5173 in your browser

### First-Time Setup

1. The app will prompt you to set a password
2. Enter a password (min 4 characters)
3. This password will be stored in Firebase and persist forever
4. Use this password to access the app in the future

## Deployment to Netlify

1. Build the project:
```bash
npm run build
```

2. Deploy to Netlify:
   - Connect your GitHub repository to Netlify, OR
   - Use the Netlify CLI: `netlify deploy --prod`

3. Set environment variables in Netlify (recommended):
   - Go to Site settings > Build & deploy > Environment
   - Add your Firebase config as environment variables (see FIREBASE_SETUP.md)

## Usage

### Adding a Trade Day

1. Click on any day in the calendar
2. Enter the total P&L for that day
3. Add trades: stock symbols and % returns
4. Select tags that describe your trading strategy
5. Add notes about the day
6. Click "Save Entry"

### Viewing Analytics

1. Click the "Analytics" button in the sidebar
2. Scroll through various charts and metrics
3. All calculations update in real-time based on your data

### Updating Net Worth

1. In the sidebar, click the ⚙️ icon next to "Account Net Worth"
2. Enter your current account value
3. Click "Save"

## Data Security

- Your data is stored in Firebase Firestore
- Password protection prevents unauthorized access
- All data is private to your Firebase project
- For production use with multiple users, implement Firebase Authentication

## Project Structure

```
plcalendar/
├── src/
│   ├── components/        # React components
│   │   ├── Calendar.tsx
│   │   ├── DayEntryModal.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Analytics.tsx
│   │   └── PasswordProtection.tsx
│   ├── hooks/            # Custom React hooks
│   │   └── useFirebaseData.ts
│   ├── utils/            # Utility functions
│   │   └── calculations.ts
│   ├── firebase.ts       # Firebase configuration
│   ├── types.ts          # TypeScript types
│   ├── App.tsx           # Main app component
│   ├── main.tsx          # Entry point
│   └── index.css         # Global styles
├── public/               # Static assets
├── FIREBASE_SETUP.md     # Firebase setup guide
└── README.md             # This file
```

## Contributing

This is a personal project, but feel free to fork it and customize it for your own use!

## License

MIT

## Support

For issues or questions, please open an issue on GitHub or refer to the Firebase setup guide.

---

Happy Trading! 📈

