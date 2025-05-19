import json
import glob
from typing import Dict
import csv

def extract_players() -> Dict[int, str]:
    # Dictionary to store player_id -> full_name
    players = {}
    
    # Get all json files in current directory
    json_files = glob.glob('*.json')
    
    for file_path in json_files:
        with open(file_path, 'r', encoding='utf-8') as f:
            try:
                data = json.load(f)
                # Access the players list from the JSON structure
                players_list = data['gameData']['players']
                
                # Extract each player's info
                for player in players_list:
                    player_id = player['id']
                    # Combine first and last name, handling empty given names
                    full_name = f"{player['f']}, {player['g']}" if player['g'] else player['f']
                    players[player_id] = full_name
                    
            except (json.JSONDecodeError, KeyError) as e:
                print(f"Error processing {file_path}: {e}")
    
    # Sort by player ID and print results
    for player_id, name in sorted(players.items()):
        print(f"ID: {player_id} - Name: {name}")
    
    # After processing all files, save to CSV
    csv_filename = 'players.csv'
    with open(csv_filename, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(['ID', 'Name'])  # Header row
        for player_id, name in sorted(players.items()):
            writer.writerow([player_id, name])
    
    print(f"\nData has been saved to {csv_filename}")
    return players

if __name__ == "__main__":
    extract_players()