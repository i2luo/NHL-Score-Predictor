"""
API endpoint for game predictions
Can be called from Next.js API routes via subprocess
"""

import sys
import json
import os
from pathlib import Path

# Redirect all print statements to stderr so stdout only contains JSON
import builtins
_original_print = builtins.print
def print_to_stderr(*args, **kwargs):
    kwargs.setdefault('file', sys.stderr)
    _original_print(*args, **kwargs)
builtins.print = print_to_stderr

# Add parent directory to path to import predict_game
sys.path.insert(0, str(Path(__file__).parent))

try:
    from predict_game import predict_game
except ImportError:
    # Fallback if import fails
    def predict_game(*args, **kwargs):
        return {'win_probability': 0.5, 'predicted_goals': 2.5}

def predict_game_api(home_team: str, away_team: str) -> dict:
    """
    Predict game outcome - API wrapper
    
    Args:
        home_team: Home team abbreviation
        away_team: Away team abbreviation
        
    Returns:
        Dictionary with win probability for home team (0-100)
    """
    try:
        # Predict from home team's perspective
        result = predict_game(home_team, away_team, is_home=True, model_dir='models')
        # Return win probability as percentage (0-100) for home team
        # Convert numpy types to Python native types for JSON serialization
        win_prob = float(result['win_probability']) * 100
        predicted_goals = float(result.get('predicted_goals', 2.5))
            
        return {
            'win_probability': round(win_prob, 1),
            'predicted_goals': round(predicted_goals, 2),
            'success': True
        }
    except FileNotFoundError as e:
        # Models not found - return default
        return {
            'win_probability': 50.0,
            'error': 'Models not found. Run train_model.py first.',
            'success': False
        }
    except Exception as e:
        # Any other error - return default
        return {
            'win_probability': 50.0,
            'error': str(e),
            'success': False
        }

if __name__ == "__main__":
    # Command line interface for Next.js to call
    # IMPORTANT: Only output JSON to stdout, all other output goes to stderr
    # Set environment variable to suppress print statements in predict_game
    import os
    os.environ['API_CALL'] = 'true'
    
    if len(sys.argv) >= 3:
        home_team = sys.argv[1]
        away_team = sys.argv[2]
        try:
            result = predict_game_api(home_team, away_team)
            # Only print JSON to stdout (this is what Next.js will parse)
            sys.stdout.write(json.dumps(result) + '\n')
            sys.stdout.flush()
        except Exception as e:
            # On error, output JSON error to stdout
            error_result = {
                'error': str(e),
                'success': False,
                'win_probability': 50.0
            }
            sys.stdout.write(json.dumps(error_result) + '\n')
            sys.stdout.flush()
    else:
        error_result = {
            'error': 'Usage: predict_api.py <home_team> <away_team>',
            'success': False,
            'win_probability': 50.0
        }
        sys.stdout.write(json.dumps(error_result) + '\n')
        sys.stdout.flush()
