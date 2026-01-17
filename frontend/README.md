# NHL Score Predictor - Frontend

Interactive Next.js frontend for the NHL Score Predictor and Simulator.

## Features

- **Upcoming Games Dashboard**: View games in the next 48 hours with win probabilities
- **Game Finder**: Search and filter games by team, date range
- **War Room Simulator**: Interactive game simulation with adjustable variables
  - Goalie selection (Starter/Backup/3rd String)
  - Rest days (Fresh/B2B/3 in 4/4 in 6)
  - Injury adjustments
  - Real-time win probability updates

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Lucide React (Icons)
- date-fns (Date formatting)

## Getting Started

1. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

2. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
frontend/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main dashboard page
│   └── globals.css         # Global styles
├── components/
│   ├── GameCard.tsx        # Game card component
│   ├── UpcomingGames.tsx   # Upcoming games view
│   ├── GameFinder.tsx      # Game search/filter
│   └── SimulatorView.tsx   # War Room simulator
├── lib/
│   ├── mockData.ts         # Mock game data
│   └── calculations.ts     # Win probability calculations
└── types/
    └── game.ts             # TypeScript interfaces
```

## Features in Detail

### Upcoming Games
- Displays games scheduled in the next 48 hours
- Shows win probability for home team
- Quick stats (goalie, injuries, B2B status)
- Click to open simulator

### Game Finder
- Search by team name
- Filter by team abbreviation
- Date range filtering
- Browse entire season

### War Room Simulator
- Real-time probability updates
- Adjustable variables:
  - Goalie selection affects win prob by ±8-15%
  - Rest days affect win prob by ±5-12%
  - Each injured player affects win prob by ±3%
- Visual probability bar
- Impact summary showing all adjustments

## Future Enhancements

- Connect to backend API for real predictions
- Add more simulation variables (lineup changes, weather, etc.)
- Historical game analysis
- User accounts and saved simulations
- Export predictions to CSV/PDF
