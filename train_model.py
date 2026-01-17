"""
XGBoost Model Training for NHL Score Prediction
Trains models to predict goals scored and game outcomes
"""

import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score, accuracy_score, classification_report
import joblib
import os
from datetime import datetime
from preprocess_data import preprocess_pipeline
import matplotlib.pyplot as plt
import seaborn as sns


def train_goals_model(X: pd.DataFrame, y: pd.Series, test_size: float = 0.2) -> dict:
    """
    Train XGBoost model to predict goals scored
    
    Args:
        X: Feature DataFrame
        y: Goals target
        test_size: Proportion of data for testing
        
    Returns:
        Dictionary with model and metrics
    """
    print("\n" + "=" * 60)
    print("Training Goals Prediction Model")
    print("=" * 60)
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=42, shuffle=True
    )
    
    print(f"\nTraining set: {len(X_train)} games")
    print(f"Test set: {len(X_test)} games")
    
    # Fill any remaining NaN values
    X_train = X_train.fillna(0)
    X_test = X_test.fillna(0)
    
    # XGBoost parameters
    params = {
        'objective': 'reg:squarederror',
        'max_depth': 6,
        'learning_rate': 0.1,
        'n_estimators': 200,
        'subsample': 0.8,
        'colsample_bytree': 0.8,
        'random_state': 42,
        'n_jobs': -1
    }
    
    # Train model
    print("\nTraining XGBoost model...")
    model = xgb.XGBRegressor(**params)
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False
    )
    
    # Predictions
    y_train_pred = model.predict(X_train)
    y_test_pred = model.predict(X_test)
    
    # Metrics
    train_mae = mean_absolute_error(y_train, y_train_pred)
    test_mae = mean_absolute_error(y_test, y_test_pred)
    train_rmse = np.sqrt(mean_squared_error(y_train, y_train_pred))
    test_rmse = np.sqrt(mean_squared_error(y_test, y_test_pred))
    train_r2 = r2_score(y_train, y_train_pred)
    test_r2 = r2_score(y_test, y_test_pred)
    
    print("\n" + "-" * 60)
    print("Model Performance:")
    print("-" * 60)
    print(f"Training MAE:  {train_mae:.3f} goals")
    print(f"Test MAE:      {test_mae:.3f} goals")
    print(f"Training RMSE: {train_rmse:.3f} goals")
    print(f"Test RMSE:     {test_rmse:.3f} goals")
    print(f"Training R²:   {train_r2:.3f}")
    print(f"Test R²:       {test_r2:.3f}")
    
    # Feature importance
    feature_importance = pd.DataFrame({
        'feature': X.columns,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print("\n" + "-" * 60)
    print("Top 10 Most Important Features:")
    print("-" * 60)
    for idx, row in feature_importance.head(10).iterrows():
        print(f"  {row['feature']:30s} {row['importance']:.4f}")
    
    return {
        'model': model,
        'train_mae': train_mae,
        'test_mae': test_mae,
        'train_rmse': train_rmse,
        'test_rmse': test_rmse,
        'train_r2': train_r2,
        'test_r2': test_r2,
        'feature_importance': feature_importance,
        'X_test': X_test,
        'y_test': y_test,
        'y_test_pred': y_test_pred
    }


def train_win_model(X: pd.DataFrame, y: pd.Series, test_size: float = 0.2) -> dict:
    """
    Train XGBoost model to predict win/loss
    
    Args:
        X: Feature DataFrame
        y: Win/loss target (1 = win, 0 = loss)
        test_size: Proportion of data for testing
        
    Returns:
        Dictionary with model and metrics
    """
    print("\n" + "=" * 60)
    print("Training Win/Loss Prediction Model")
    print("=" * 60)
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=42, shuffle=True
    )
    
    print(f"\nTraining set: {len(X_train)} games")
    print(f"Test set: {len(X_test)} games")
    
    # Fill any remaining NaN values
    X_train = X_train.fillna(0)
    X_test = X_test.fillna(0)
    
    # XGBoost parameters
    params = {
        'objective': 'binary:logistic',
        'max_depth': 6,
        'learning_rate': 0.1,
        'n_estimators': 200,
        'subsample': 0.8,
        'colsample_bytree': 0.8,
        'random_state': 42,
        'n_jobs': -1
    }
    
    # Train model
    print("\nTraining XGBoost model...")
    model = xgb.XGBClassifier(**params)
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False
    )
    
    # Predictions
    y_train_pred = model.predict(X_train)
    y_test_pred = model.predict(X_test)
    y_test_proba = model.predict_proba(X_test)[:, 1]
    
    # Metrics
    train_acc = accuracy_score(y_train, y_train_pred)
    test_acc = accuracy_score(y_test, y_test_pred)
    
    print("\n" + "-" * 60)
    print("Model Performance:")
    print("-" * 60)
    print(f"Training Accuracy: {train_acc:.3f}")
    print(f"Test Accuracy:     {test_acc:.3f}")
    
    print("\nClassification Report:")
    print(classification_report(y_test, y_test_pred, target_names=['Loss', 'Win']))
    
    # Feature importance
    feature_importance = pd.DataFrame({
        'feature': X.columns,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print("\n" + "-" * 60)
    print("Top 10 Most Important Features:")
    print("-" * 60)
    for idx, row in feature_importance.head(10).iterrows():
        print(f"  {row['feature']:30s} {row['importance']:.4f}")
    
    return {
        'model': model,
        'train_acc': train_acc,
        'test_acc': test_acc,
        'feature_importance': feature_importance,
        'X_test': X_test,
        'y_test': y_test,
        'y_test_pred': y_test_pred,
        'y_test_proba': y_test_proba
    }


def plot_results(goals_results: dict, win_results: dict, save_dir: str = 'plots'):
    """Create visualization plots for model results"""
    os.makedirs(save_dir, exist_ok=True)
    
    # Goals prediction scatter plot
    plt.figure(figsize=(10, 6))
    plt.scatter(goals_results['y_test'], goals_results['y_test_pred'], alpha=0.5)
    plt.plot([0, 10], [0, 10], 'r--', lw=2)
    plt.xlabel('Actual Goals')
    plt.ylabel('Predicted Goals')
    plt.title('Goals Prediction: Actual vs Predicted')
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(f'{save_dir}/goals_prediction.png', dpi=150)
    print(f"\nSaved plot: {save_dir}/goals_prediction.png")
    
    # Feature importance for goals model
    plt.figure(figsize=(10, 8))
    top_features = goals_results['feature_importance'].head(15)
    plt.barh(range(len(top_features)), top_features['importance'])
    plt.yticks(range(len(top_features)), top_features['feature'])
    plt.xlabel('Feature Importance')
    plt.title('Top 15 Features for Goals Prediction')
    plt.gca().invert_yaxis()
    plt.tight_layout()
    plt.savefig(f'{save_dir}/goals_feature_importance.png', dpi=150)
    print(f"Saved plot: {save_dir}/goals_feature_importance.png")
    
    # Win prediction confusion matrix
    from sklearn.metrics import confusion_matrix
    cm = confusion_matrix(win_results['y_test'], win_results['y_test_pred'])
    plt.figure(figsize=(8, 6))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', 
                xticklabels=['Loss', 'Win'], yticklabels=['Loss', 'Win'])
    plt.ylabel('Actual')
    plt.xlabel('Predicted')
    plt.title('Win/Loss Prediction Confusion Matrix')
    plt.tight_layout()
    plt.savefig(f'{save_dir}/win_confusion_matrix.png', dpi=150)
    print(f"Saved plot: {save_dir}/win_confusion_matrix.png")
    
    plt.close('all')


def save_models(goals_results: dict, win_results: dict, model_dir: str = 'models'):
    """Save trained models"""
    os.makedirs(model_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    # Save goals model
    goals_path = f'{model_dir}/goals_model_{timestamp}.pkl'
    joblib.dump(goals_results['model'], goals_path)
    print(f"\nSaved goals model: {goals_path}")
    
    # Save win model
    win_path = f'{model_dir}/win_model_{timestamp}.pkl'
    joblib.dump(win_results['model'], win_path)
    print(f"Saved win model: {win_path}")
    
    # Save feature names
    feature_names_path = f'{model_dir}/feature_names_{timestamp}.txt'
    with open(feature_names_path, 'w') as f:
        f.write('\n'.join(goals_results['model'].feature_names_in_))
    print(f"Saved feature names: {feature_names_path}")
    
    return goals_path, win_path, feature_names_path


def main():
    """Main training pipeline"""
    print("=" * 60)
    print("NHL Score Predictor - Model Training")
    print("=" * 60)
    
    # Preprocess data
    X, y_goals, y_win = preprocess_pipeline()
    
    # Train goals model
    goals_results = train_goals_model(X, y_goals)
    
    # Train win/loss model
    win_results = train_win_model(X, y_win)
    
    # Create visualizations
    print("\n" + "=" * 60)
    print("Creating Visualizations")
    print("=" * 60)
    plot_results(goals_results, win_results)
    
    # Save models
    print("\n" + "=" * 60)
    print("Saving Models")
    print("=" * 60)
    goals_path, win_path, feature_path = save_models(goals_results, win_results)
    
    print("\n" + "=" * 60)
    print("Training Complete!")
    print("=" * 60)
    print(f"\nModels saved in 'models/' directory")
    print(f"Plots saved in 'plots/' directory")


if __name__ == "__main__":
    main()
