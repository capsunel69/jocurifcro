import json
import csv
import os

def convert_all_players_to_csv(output_file):
    # Write to CSV
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        # Write header
        writer.writerow(['Player ID', 'Full Name', 'Bingo Card'])
        
        # Process all JSON files in current directory
        for filename in os.listdir('.'):
            if filename.endswith('.json'):
                # Extract bingo card number from filename
                bingo_number = os.path.splitext(filename)[0]
                
                with open(filename, 'r', encoding='utf-8') as json_file:
                    data = json.load(json_file)
                
                # Get players data
                players = data['gameData']['players']
                
                # Write player data
                for player in players:
                    # Combine first and given names
                    full_name = f"{player['g']} {player['f']}".strip()
                    writer.writerow([player['id'], full_name, bingo_number])

# Run the conversion
convert_all_players_to_csv('all_players.csv')