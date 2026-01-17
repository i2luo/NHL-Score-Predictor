"""
Data Preprocessing and Feature Engineering for NHL Score Prediction
Prepares scraped game data for machine learning model training
"""

import pandas as pd
import numpy as np
from typing import Tuple, List
import json
from datetime import datetime
import os


def load_data(json_file: str = None) -> pd.DataFrame:
    """
    Load game data from JSON file
    
    Args:
        json_file: Path to JSON file. If None, finds most recent file.
        
    Returns:
        DataFrame with game data
    """
    if json_file is None:
        # Find most recent JSON file
        json_files = [f for f in os.listdir('.') if f.startswith('nhl_games_') and f.endswith('.json')]
        if not json_files:
            raise FileNotFoundError("No NHL game data files found. Run scraper.py first.")
        json_file = max(json_files, key=os.path.getctime)
        print(f"Loading data from: {json_file}")
    
    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    df = pd.DataFrame(data)
    print(f"Loaded {len(df)} games")
    return df


def convert_numeric_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Convert string numeric columns to proper numeric types"""
    numeric_cols = [
        'rank', 'game_num', 'goals_for', 'goals_against', 'shots', 'penalty_minutes',
        'power_play_goals', 'power_play_opportunities', 'short_handed_goals',
        'shots_against', 'opp_penalty_minutes', 'opp_power_play_goals',
        'opp_power_play_opportunities', 'opp_short_handed_goals',
        'faceoff_wins', 'faceoff_losses', 'faceoff_percentage',
        'corsi_for', 'corsi_against', 'corsi_percentage',
        'fenwick_for', 'fenwick_against', 'fenwick_percentage',
        'offensive_zone_start_pct', 'pdo'
    ]
    
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')
    
    return df


def create_rolling_features(df: pd.DataFrame, window: int = 10) -> pd.DataFrame:
    """
    Create rolling average features for each team
    
    Args:
        df: DataFrame with game data
        window: Number of previous games to use for rolling averages
        
    Returns:
        DataFrame with rolling features added
    """
    df = df.sort_values(['team', 'date']).reset_index(drop=True)
    
    # Features to create rolling averages for
    rolling_features = [
        'goals_for', 'goals_against', 'shots', 'shots_against',
        'power_play_goals', 'power_play_opportunities',
        'faceoff_percentage', 'corsi_percentage', 'fenwick_percentage',
        'pdo'
    ]
    
    for feature in rolling_features:
        if feature in df.columns:
            # Rolling average for the team
            df[f'{feature}_rolling_{window}'] = (
                df.groupby('team')[feature]
                .shift(1)  # Exclude current game
                .rolling(window=window, min_periods=1)
                .mean()
                .reset_index(0, drop=True)
            )
    
    return df


def create_team_season_stats(df: pd.DataFrame) -> pd.DataFrame:
    """Create season-level statistics for each team"""
    df = df.sort_values(['team', 'season', 'date']).reset_index(drop=True)
    
    # Calculate cumulative stats up to each game
    team_season_stats = []
    
    for (team, season), group in df.groupby(['team', 'season']):
        group = group.copy()
        group = group.sort_values('date')
        
        # Cumulative averages (excluding current game)
        for i in range(len(group)):
            if i == 0:
                # First game of season - use 0 or NaN
                group.loc[group.index[i], 'season_gf_avg'] = 0
                group.loc[group.index[i], 'season_ga_avg'] = 0
                group.loc[group.index[i], 'season_shots_avg'] = 0
                group.loc[group.index[i], 'season_wins'] = 0
                group.loc[group.index[i], 'season_games'] = 0
            else:
                # Use previous games
                prev_games = group.iloc[:i]
                group.loc[group.index[i], 'season_gf_avg'] = prev_games['goals_for'].mean()
                group.loc[group.index[i], 'season_ga_avg'] = prev_games['goals_against'].mean()
                group.loc[group.index[i], 'season_shots_avg'] = prev_games['shots'].mean()
                group.loc[group.index[i], 'season_wins'] = (prev_games['result'] == 'W').sum()
                group.loc[group.index[i], 'season_games'] = len(prev_games)
        
        team_season_stats.append(group)
    
    df = pd.concat(team_season_stats, ignore_index=True)
    df['season_win_pct'] = df['season_wins'] / df['season_games'].replace(0, 1)
    
    return df


def create_opponent_features(df: pd.DataFrame) -> pd.DataFrame:
    """Create features based on opponent's recent performance"""
    df = df.sort_values(['date']).reset_index(drop=True)
    
    # Convert date to datetime for comparison
    df['date'] = pd.to_datetime(df['date'], errors='coerce')
    
    # For each game, get opponent's recent stats
    opponent_stats = []
    
    print("  Processing opponent features (this may take a while)...")
    for idx, row in df.iterrows():
        if idx % 1000 == 0:
            print(f"    Processed {idx}/{len(df)} games...")
        
        opp = row['opponent']
        game_date = row['date']
        
        # Get opponent's games before this date
        opp_games = df[
            (df['team'] == opp) & 
            (df['date'] < game_date)
        ].tail(10)  # Last 10 games
        
        if len(opp_games) > 0:
            opponent_stats.append({
                'opp_gf_avg': opp_games['goals_for'].mean(),
                'opp_ga_avg': opp_games['goals_against'].mean(),
                'opp_shots_avg': opp_games['shots'].mean(),
                'opp_wins_recent': (opp_games['result'] == 'W').sum()
            })
        else:
            opponent_stats.append({
                'opp_gf_avg': np.nan,
                'opp_ga_avg': np.nan,
                'opp_shots_avg': np.nan,
                'opp_wins_recent': np.nan
            })
    
    opp_df = pd.DataFrame(opponent_stats, index=df.index)
    df = pd.concat([df, opp_df], axis=1)
    
    return df


def create_interaction_features(df: pd.DataFrame) -> pd.DataFrame:
    """Create interaction features between team and opponent stats"""
    # Goal differential
    df['goal_differential'] = df['goals_for'] - df['goals_against']
    
    # Shot differential
    df['shot_differential'] = df['shots'] - df['shots_against']
    
    # Power play efficiency
    df['pp_efficiency'] = df['power_play_goals'] / df['power_play_opportunities'].replace(0, 1)
    df['opp_pp_efficiency'] = df['opp_power_play_goals'] / df['opp_power_play_opportunities'].replace(0, 1)
    
    # Home/away indicator
    df['is_home'] = (df['game_location'] != '@').astype(int)
    
    # Fill NaN values
    df = df.fillna(0)
    
    return df


def prepare_features(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series]:
    """
    Prepare features and target variable for model training
    
    Args:
        df: Preprocessed DataFrame
        
    Returns:
        X: Feature DataFrame
        y: Target Series (goals_for)
    """
    # Remove games without complete data
    df = df.dropna(subset=['goals_for', 'goals_against', 'result'])
    
    # Select features for model
    feature_columns = [
        # Team rolling stats
        'goals_for_rolling_10', 'goals_against_rolling_10',
        'shots_rolling_10', 'shots_against_rolling_10',
        'power_play_goals_rolling_10', 'faceoff_percentage_rolling_10',
        'corsi_percentage_rolling_10', 'pdo_rolling_10',
        
        # Season stats
        'season_gf_avg', 'season_ga_avg', 'season_shots_avg',
        'season_win_pct', 'season_games',
        
        # Opponent stats
        'opp_gf_avg', 'opp_ga_avg', 'opp_shots_avg', 'opp_wins_recent',
        
        # Game context
        'is_home', 'power_play_opportunities', 'opp_power_play_opportunities',
        
        # Interaction features
        'pp_efficiency', 'opp_pp_efficiency'
    ]
    
    # Only use features that exist
    available_features = [f for f in feature_columns if f in df.columns]
    
    X = df[available_features].copy()
    
    # Target: goals scored by the team
    y = df['goals_for'].copy()
    
    # Also create win/loss target
    y_win = (df['result'] == 'W').astype(int)
    
    return X, y, y_win


def preprocess_pipeline(json_file: str = None, window: int = 10) -> Tuple[pd.DataFrame, pd.Series, pd.Series]:
    """
    Complete preprocessing pipeline
    
    Args:
        json_file: Path to JSON file (optional)
        window: Rolling window size
        
    Returns:
        X: Feature DataFrame
        y_goals: Goals target
        y_win: Win/loss target
    """
    print("=" * 60)
    print("NHL Data Preprocessing Pipeline")
    print("=" * 60)
    
    # Load data
    print("\n1. Loading data...")
    df = load_data(json_file)
    
    # Convert numeric columns
    print("\n2. Converting data types...")
    df = convert_numeric_columns(df)
    
    # Create rolling features
    print(f"\n3. Creating rolling features (window={window})...")
    df = create_rolling_features(df, window=window)
    
    # Create season stats
    print("\n4. Creating season-level statistics...")
    df = create_team_season_stats(df)
    
    # Create opponent features
    print("\n5. Creating opponent features...")
    df = create_opponent_features(df)
    
    # Create interaction features
    print("\n6. Creating interaction features...")
    df = create_interaction_features(df)
    
    # Prepare final features
    print("\n7. Preparing features for model...")
    X, y_goals, y_win = prepare_features(df)
    
    print(f"\n✓ Preprocessing complete!")
    print(f"  Final dataset shape: {X.shape}")
    print(f"  Features: {list(X.columns)}")
    print(f"  Missing values: {X.isna().sum().sum()}")
    
    return X, y_goals, y_win
