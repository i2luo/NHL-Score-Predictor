"""
Batch prediction API for multiple games
Loads data once and predicts all games efficiently
"""

import sys
import json
import os
from pathlib import Path
from typing import List, Dict

# Redirect all print statements to stderr so stdout only contains JSON
import builtins
_original_print = builtins.print
def print_to_stderr(*args, **kwargs):
    kwargs.setdefault('file', sys.stderr)
    _original_print(*args, **kwargs)
builtins.print = print_to_stderr

# Set API_CALL environment variable
os.environ['API_CALL'] = 'true'

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

try:
    from predict_game import load_models, prepare_game_features
    from preprocess_data import load_data, convert_numeric_columns, create_rolling_features, create_team_season_stats, create_opponent_features, create_interaction_features
except ImportError as e:
    print(f"Import error: {e}", file=sys.stderr)
    sys.exit(1)

# Global cache for models and data
_models_cache = None
_data_cache = None

def get_models_and_data():
    """Load models and data once, cache them"""
    global _models_cache, _data_cache
    
    # Determine model directory (Vercel vs local)
    import os
    model_dir = 'models'
    if os.path.exists(os.path.join(os.getcwd(), 'models')):
        model_dir = 'models'
    elif os.path.exists(os.path.join(os.path.dirname(__file__), '..', 'models')):
        model_dir = os.path.join(os.path.dirname(__file__), '..', 'models')
    
    if _models_cache is None:
        _models_cache = load_models(model_dir)
    
    if _data_cache is None:
        # Load and preprocess data once
        # Try to find data file in various locations (Vercel vs local)
        import os
        data_file = None
        possible_paths = [
            os.path.join(os.getcwd(), 'data', 'nhl_games_2021_2026.json'),  # Vercel path
            os.path.join(os.path.dirname(__file__), '..', 'data', 'nhl_games_2021_2026.json'),  # Vercel relative
            os.path.join(os.path.dirname(__file__), '..', 'nhl_games_2021_2026.json'),  # Local dev
            os.path.join(os.getcwd(), 'nhl_games_2021_2026.json'),  # Current dir
        ]
        for p in possible_paths:
            if os.path.exists(p):
                data_file = p
                print(f"Found data file at: {data_file}", file=sys.stderr)
                break
        
        if data_file:
            df = load_data(data_file)
        else:
            # Try default behavior (searches current directory)
            df = load_data()
        
        df = convert_numeric_columns(df)
        df = create_rolling_features(df, window=10)
        df = create_team_season_stats(df)
        df = create_opponent_features(df)
        df = create_interaction_features(df)
        _data_cache = df
    
    return _models_cache, _data_cache

def predict_batch(games: List[Dict[str, str]]) -> Dict[str, Dict]:
    """
    Predict multiple games efficiently
    
    Args:
        games: List of dicts with 'homeTeam' and 'awayTeam' keys
        
    Returns:
        Dict mapping game_id to prediction result
    """
    try:
        goals_model, win_model, feature_names = get_models_and_data()[0]
        df = get_models_and_data()[1]
        
        results = {}
        
        for game in games:
            home_team = game.get('homeTeam', '')
            away_team = game.get('awayTeam', '')
            game_id = game.get('id', f"{away_team}@{home_team}")
            
            try:
                # Prepare features (pass historical_data parameter)
                # Make a copy of df to avoid modifying the cached version
                df_copy = df.copy()
                features = prepare_game_features(home_team, away_team, is_home=True, historical_data=df_copy)
                
                # Ensure all required features are present
                for feat in feature_names:
                    if feat not in features.columns:
                        features[feat] = 0
                
                # Select only features used by model
                features = features[feature_names]
                features = features.fillna(0)
                
                # Make predictions
                predicted_goals = goals_model.predict(features)[0]
                win_prob = win_model.predict_proba(features)[0][1]
                
                results[game_id] = {
                    'win_probability': round(float(win_prob) * 100, 1),
                    'predicted_goals': round(float(predicted_goals), 2),
                    'success': True
                }
            except Exception as e:
                results[game_id] = {
                    'win_probability': 50.0,
                    'error': str(e),
                    'success': False
                }
        
        return results
    except Exception as e:
        # Return default for all games on error
        return {
            game.get('id', f"{game.get('awayTeam', '')}@{game.get('homeTeam', '')}"): {
                'win_probability': 50.0,
                'error': str(e),
                'success': False
            }
            for game in games
        }

if __name__ == "__main__":
    # Read games from stdin as JSON array
    try:
        input_data = sys.stdin.read()
        games = json.loads(input_data)
        
        if not isinstance(games, list):
            raise ValueError("Input must be a JSON array of games")
        
        results = predict_batch(games)
        
        # Output JSON to stdout
        sys.stdout.write(json.dumps(results) + '\n')
        sys.stdout.flush()
    except Exception as e:
        error_result = {
            'error': str(e),
            'success': False
        }
        sys.stdout.write(json.dumps(error_result) + '\n')
        sys.stdout.flush()
        sys.exit(1)
