# NHL Score Predictor - Backend Scraper

A web scraper for collecting NHL game log data from [hockey-reference.com](https://www.hockey-reference.com) to build a score prediction model.

## Features

- Scrapes game-by-game statistics for all 32 NHL teams
- Extracts comprehensive game data including:
  - Basic stats (goals, shots, penalty minutes)
  - Power play and penalty kill statistics
  - Faceoff statistics
  - Advanced 5-on-5 metrics (Corsi, Fenwick, PDO, Zone Starts)
- Saves data in both JSON and CSV formats
- Includes rate limiting to be respectful to the website
- Handles errors gracefully

## Installation

1. Install Python 3.8 or higher
2. Install dependencies:

```bash
pip install -r requirements.txt
```

## Usage

### Basic Usage

Run the scraper to collect data for the past 5 seasons (current + 4 previous) for all teams:

```bash
python scraper.py
```

This will scrape data from the current season and the 4 previous seasons, collecting game logs for all 32 NHL teams.

### Test First

Before scraping all teams and seasons, test with a single team:

```bash
python test_scraper.py
```

This will test scraping Vancouver Canucks for both a single season and multiple seasons.

### Custom Seasons

To scrape a different number of seasons, modify the `get_past_seasons()` call in `main()`:

```python
# In scraper.py main() function, change:
seasons = get_past_seasons(num_seasons=5)  # Change 5 to desired number
```

To scrape only the current season, use:

```python
from scraper import scrape_all_teams, get_current_season_year

year = get_current_season_year()
games = scrape_all_teams(year=year, delay=1.5)
```

### Output Files

The scraper generates two output files with data from all scraped seasons:
- `nhl_games_YYYY_YYYY.json` - JSON format with all game data (e.g., `nhl_games_2021_2026.json`)
- `nhl_games_YYYY_YYYY.csv` - CSV format for easy analysis

The filename includes the range of seasons (e.g., `2021_2026` means seasons 2021-22 through 2025-26).

Each game record includes a `season` field (e.g., "2025-2026") so you can filter by season if needed.

## Data Structure

Each game record contains the following fields:

- **Team Information**: `team`, `season`, `game_num`, `date`
- **Game Result**: `result` (W/L), `goals_for`, `goals_against`, `overtime`
- **Basic Stats**: `shots`, `penalty_minutes`, `opponent`
- **Special Teams**: `power_play_goals`, `power_play_opportunities`, `short_handed_goals`
- **Opponent Stats**: `opp_power_play_goals`, `opp_power_play_opportunities`, etc.
- **Faceoffs**: `faceoff_wins`, `faceoff_losses`, `faceoff_percentage`
- **Advanced Metrics**: `corsi_for`, `corsi_against`, `corsi_percentage`, `fenwick_for`, `fenwick_against`, `fenwick_percentage`, `offensive_zone_start_pct`, `pdo`

## NHL Teams

The scraper includes all 32 NHL teams:
- Anaheim Ducks (ANA)
- Arizona Coyotes (ARI)
- Boston Bruins (BOS)
- Buffalo Sabres (BUF)
- Calgary Flames (CGY)
- Carolina Hurricanes (CAR)
- Chicago Blackhawks (CHI)
- Colorado Avalanche (COL)
- Columbus Blue Jackets (CBJ)
- Dallas Stars (DAL)
- Detroit Red Wings (DET)
- Edmonton Oilers (EDM)
- Florida Panthers (FLA)
- Los Angeles Kings (LAK)
- Minnesota Wild (MIN)
- Montreal Canadiens (MTL)
- Nashville Predators (NSH)
- New Jersey Devils (NJD)
- New York Islanders (NYI)
- New York Rangers (NYR)
- Ottawa Senators (OTT)
- Philadelphia Flyers (PHI)
- Pittsburgh Penguins (PIT)
- San Jose Sharks (SJS)
- Seattle Kraken (SEA)
- St. Louis Blues (STL)
- Tampa Bay Lightning (TBL)
- Toronto Maple Leafs (TOR)
- Utah (UTA)
- Vancouver Canucks (VAN)
- Vegas Golden Knights (VEG)
- Washington Capitals (WSH)
- Winnipeg Jets (WPG)

## Rate Limiting

The scraper includes a 1.5 second delay between requests to be respectful to the website. You can adjust this in the `scrape_all_teams()` function.

## Error Handling

The scraper handles:
- Network errors
- Missing data
- Invalid team abbreviations
- Empty or incomplete game records

## Injury Data Scraper

The project includes a separate scraper for collecting player injury data from [PuckPedia](https://puckpedia.com/injuries).

### Scraping Injury Data

Run the injury scraper to get current injury counts per team:

```bash
python scrape_injuries.py
```

This will:
- Scrape injury data from PuckPedia
- Count injuries per team
- Save two files:
  - `nhl_injuries.json` - Summary with injury counts per team
  - `nhl_injuries_detailed.json` - Detailed data with player names, status, timeline, and reason

The frontend API will automatically use this data when available. If the injury data file doesn't exist, injury counts will default to 0.

**Note**: The injury scraper should be run periodically (e.g., daily) to keep injury data up-to-date, as injuries change frequently throughout the season.

## Machine Learning Pipeline

After collecting the data, you can train XGBoost models to predict game outcomes.

### Step 1: Collect Data
```bash
python scraper.py
```

### Step 2: Train Models
```bash
python train_model.py
```

This will:
- Preprocess the data and create features
- Train two XGBoost models:
  - **Goals Model**: Predicts how many goals a team will score
  - **Win/Loss Model**: Predicts whether a team will win or lose
- Generate evaluation metrics and visualizations
- Save trained models to `models/` directory

### Step 3: Make Predictions
```bash
python predict_game.py
```

Or use the models programmatically:
```python
from predict_game import predict_game

prediction = predict_game('VAN', 'EDM', is_home=True)
print(f"Predicted goals: {prediction['predicted_goals']}")
print(f"Win probability: {prediction['win_probability']:.1%}")
```

## Model Features

The models use the following features:
- **Team Rolling Averages**: Goals, shots, power play stats over last 10 games
- **Season Statistics**: Season averages for goals, shots, win percentage
- **Opponent Statistics**: Opponent's recent performance
- **Game Context**: Home/away, power play opportunities
- **Advanced Metrics**: Corsi, Fenwick, PDO, faceoff percentage

## Output Files

After training, you'll find:
- `models/goals_model_*.pkl` - Trained goals prediction model
- `models/win_model_*.pkl` - Trained win/loss prediction model
- `models/feature_names_*.txt` - List of features used
- `plots/goals_prediction.png` - Scatter plot of predictions
- `plots/goals_feature_importance.png` - Feature importance chart
- `plots/win_confusion_matrix.png` - Classification performance

## Next Steps

After training models, you can:
1. Create API endpoints to serve predictions
2. Build a web interface for predictions
3. Fine-tune hyperparameters for better performance
4. Add more features (player stats, injuries, etc.)

## License

This project is for educational purposes. Please respect the terms of service of hockey-reference.com when scraping their data.
