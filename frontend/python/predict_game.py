"""
Predict NHL game outcomes using trained XGBoost models
"""

import pandas as pd
import numpy as np
import joblib
import os
from typing import Dict, Tuple
from preprocess_data import preprocess_pipeline


def load_models(model_dir: str = 'models') -> Tuple:
    """
    Load the most recent trained models
    
    Args:
        model_dir: Directory containing model files
        
    Returns:
        Tuple of (goals_model, win_model, feature_names)
    """
    import os
    is_api_call = os.environ.get('API_CALL') == 'true'
    
    # Find most recent model files
    goals_models = [f for f in os.listdir(model_dir) if f.startswith('goals_model_') and f.endswith('.pkl')]
    win_models = [f for f in os.listdir(model_dir) if f.startswith('win_model_') and f.endswith('.pkl')]
    feature_files = [f for f in os.listdir(model_dir) if f.startswith('feature_names_') and f.endswith('.txt')]
    
    if not goals_models or not win_models:
        raise FileNotFoundError(f"No trained models found in {model_dir}. Run train_model.py first.")
    
    # Get most recent models
    goals_path = os.path.join(model_dir, max(goals_models))
    win_path = os.path.join(model_dir, max(win_models))
    feature_path = os.path.join(model_dir, max(feature_files)) if feature_files else None
    
    # Load models
    goals_model = joblib.load(goals_path)
    win_model = joblib.load(win_path)
    
    # Load feature names
    if feature_path:
        with open(feature_path, 'r') as f:
            feature_names = [line.strip() for line in f.readlines()]
    else:
        feature_names = goals_model.feature_names_in_
    
    if not is_api_call:
        print(f"Loaded goals model: {goals_path}")
        print(f"Loaded win model: {win_path}")
    
    return goals_model, win_model, feature_names


def prepare_game_features(team: str, opponent: str, is_home: bool, 
                         historical_data: pd.DataFrame) -> pd.DataFrame:
    """
    Prepare features for a single game prediction
    
    Args:
        team: Team abbreviation
        opponent: Opponent abbreviation
        is_home: Whether team is playing at home
        historical_data: Full historical dataset for feature calculation
        
    Returns:
        DataFrame with single row of features
    """
    # Get team's recent games - only use games that have been played (have a result)
    # Filter out future games (games without results/goals)
    team_all = historical_data[historical_data['team'] == team].copy()
    opp_all = historical_data[historical_data['team'] == opponent].copy()
    
    # Only use games that have been played (have a result and goals)
    # Filter out future games (games without results or with NaN goals)
    team_played = team_all[
        (team_all['result'].notna()) & 
        (team_all['result'] != '') &
        (team_all['goals_for'].notna()) &
        (team_all['goals_against'].notna()) &
        ((team_all['goals_for'] > 0) | (team_all['goals_against'] > 0))  # At least one team scored
    ]
    opp_played = opp_all[
        (opp_all['result'].notna()) & 
        (opp_all['result'] != '') &
        (opp_all['goals_for'].notna()) &
        (opp_all['goals_against'].notna()) &
        ((opp_all['goals_for'] > 0) | (opp_all['goals_against'] > 0))  # At least one team scored
    ]
    
    # Get last 10 played games (most recent first)
    team_games = team_played.tail(10)
    opp_games = opp_played.tail(10)
    
    if len(team_games) == 0:
        raise ValueError(f"No historical data found for team: {team}")
    if len(opp_games) == 0:
        raise ValueError(f"No historical data found for opponent: {opponent}")
    
    # Calculate features similar to preprocessing
    features = {}
    
    # Team rolling averages
    features['goals_for_rolling_10'] = team_games['goals_for'].mean()
    features['goals_against_rolling_10'] = team_games['goals_against'].mean()
    features['shots_rolling_10'] = team_games['shots'].mean()
    features['shots_against_rolling_10'] = team_games['shots_against'].mean()
    features['power_play_goals_rolling_10'] = team_games['power_play_goals'].mean()
    features['faceoff_percentage_rolling_10'] = team_games['faceoff_percentage'].mean()
    features['corsi_percentage_rolling_10'] = team_games['corsi_percentage'].mean()
    features['pdo_rolling_10'] = team_games['pdo'].mean()
    
    # Season stats
    current_season = team_games['season'].iloc[-1]
    season_games = team_games[team_games['season'] == current_season]
    features['season_gf_avg'] = season_games['goals_for'].mean()
    features['season_ga_avg'] = season_games['goals_against'].mean()
    features['season_shots_avg'] = season_games['shots'].mean()
    features['season_wins'] = (season_games['result'] == 'W').sum()
    features['season_games'] = len(season_games)
    features['season_win_pct'] = features['season_wins'] / max(features['season_games'], 1)
    
    # Opponent stats
    features['opp_gf_avg'] = opp_games['goals_for'].mean()
    features['opp_ga_avg'] = opp_games['goals_against'].mean()
    features['opp_shots_avg'] = opp_games['shots'].mean()
    features['opp_wins_recent'] = (opp_games['result'] == 'W').sum()
    
    # Game context
    features['is_home'] = 1 if is_home else 0
    features['power_play_opportunities'] = team_games['power_play_opportunities'].mean()
    features['opp_power_play_opportunities'] = opp_games['power_play_opportunities'].mean()
    
    # Interaction features
    features['pp_efficiency'] = (
        team_games['power_play_goals'].sum() / 
        max(team_games['power_play_opportunities'].sum(), 1)
    )
    features['opp_pp_efficiency'] = (
        opp_games['power_play_goals'].sum() / 
        max(opp_games['power_play_opportunities'].sum(), 1)
    )
    
    # Create DataFrame
    feature_df = pd.DataFrame([features])
    
    return feature_df


def predict_game(team: str, opponent: str, is_home: bool = True,
                 model_dir: str = 'models') -> Dict:
    """
    Predict outcome of a single game
    
    Args:
        team: Team abbreviation
        opponent: Opponent abbreviation
        is_home: Whether team is playing at home
        model_dir: Directory containing models
        
    Returns:
        Dictionary with predictions
    """
    # Load models
    goals_model, win_model, feature_names = load_models(model_dir)
    
    # Load full historical data for feature calculation
    # Suppress print statements when called from API
    import sys
    import os
    is_api_call = os.environ.get('API_CALL') == 'true'
    
    if not is_api_call:
        print("\nLoading historical data...")
    from preprocess_data import load_data, convert_numeric_columns, create_rolling_features, create_team_season_stats, create_opponent_features, create_interaction_features
    
    # Load raw data
    df = load_data()
    df = convert_numeric_columns(df)
    
    # Create all features (same as preprocessing pipeline)
    df = create_rolling_features(df, window=10)
    df = create_team_season_stats(df)
    df = create_opponent_features(df)
    df = create_interaction_features(df)
    
    # Prepare features using real historical data
    if not is_api_call:
        print(f"\nPreparing features for {team} vs {opponent} using real historical data...")
    features = prepare_game_features(team, opponent, is_home, df)
    
    # Ensure all required features are present
    for feat in feature_names:
        if feat not in features.columns:
            features[feat] = 0
    
    # Select only features used by model
    features = features[feature_names]
    features = features.fillna(0)
    
    # Make predictions
    predicted_goals = goals_model.predict(features)[0]
    win_probability = win_model.predict_proba(features)[0][1]
    predicted_win = win_model.predict(features)[0]
    
    result = {
        'team': team,
        'opponent': opponent,
        'is_home': is_home,
        'predicted_goals': round(predicted_goals, 2),
        'win_probability': round(win_probability, 3),
        'predicted_result': 'Win' if predicted_win == 1 else 'Loss'
    }
    
    return result


def main():
    """Example usage"""
    print("=" * 60)
    print("NHL Game Prediction")
    print("=" * 60)
    
    # Example prediction
    team = 'VAN'
    opponent = 'EDM'
    is_home = True
    
    try:
        prediction = predict_game(team, opponent, is_home)
        
        print(f"\nPrediction for {team} vs {opponent}")
        print(f"Home team: {team if is_home else opponent}")
        print("-" * 60)
        print(f"Predicted Goals: {prediction['predicted_goals']}")
        print(f"Win Probability: {prediction['win_probability']:.1%}")
        print(f"Predicted Result: {prediction['predicted_result']}")
        print("=" * 60)
        
    except Exception as e:
        print(f"\nError: {e}")
        print("\nMake sure you have:")
        print("1. Run scraper.py to collect data")
        print("2. Run train_model.py to train models")


if __name__ == "__main__":
    main()
