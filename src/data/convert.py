import pandas as pd
import json
import re

# Base ID constant - change this to modify all IDs
BASE_ID = 1003

def get_category_type(column_name):
    """Determine category type based on column prefix."""
    type_mapping = {
        'team_': 2,        # Teams
        'country_': 1,     # Countries
        'league_play_': 3, # Leagues played in
        'coached_by_': 4,  # Managers/Coaches
        'teamplayer_': 5,  # Players
        'league_won_': 6,  # Achievements/Competitions
        'cup_won_': 6      # Achievements/Competitions
    }
    
    for prefix, type_num in type_mapping.items():
        if column_name.startswith(prefix):
            return type_num
    return None

def create_display_name(name, type_num):
    """Create a shorter display name based on the full name and type."""
    # For countries (type 1) - use 3-letter codes
    if type_num == 1:
        return name[:3].upper()
    
    # For teams (type 2)
    if type_num == 2:
        words = name.split()
        if len(words) >= 2:
            if words[0].lower().startswith('poli'):
                return f"Poli {words[1]}"
            return words[0]
        return name
    
    # For managers/coaches (type 4)
    if type_num == 4:
        # Remove "Coached By" prefix if present and return full name
        name = name.replace('Coached By ', '')
        return name
    
    # For players (type 5)
    if type_num == 5:
        return name.split()[-1]  # Return last name
    
    # For all other types
    return name

def create_remit_from_columns(columns):
    """Dynamically create remit items from CSV columns."""
    remit = []
    column_to_id_map = {}
    
    # Filter out the 'Player' column
    category_columns = [col for col in columns if col != 'Player']
    
    for counter, column in enumerate(category_columns, 1):
        # Create ID in format BASE_ID_1, BASE_ID_2, etc.
        remit_id = f"{BASE_ID}_{counter}"
        
        # Extract the actual name from the column
        name = column.replace('team_', '')
        name = name.replace('country_', '')
        name = name.replace('league_play_', 'Played in ')
        name = name.replace('league_won_', '')
        name = name.replace('cup_won_', '')
        name = name.replace('coached_by_', '')
        name = name.replace('teamplayer_', '')
        name = name.replace('_', ' ').title()
        
        type_num = get_category_type(column)
        if type_num:
            display_name = create_display_name(name, type_num)
            remit_item = [{
                "id": remit_id,
                "name": name,
                "type": type_num,
                "displayName": display_name
            }]
            remit.append(remit_item)
            column_to_id_map[column] = remit_id
    
    return remit, column_to_id_map

def convert_csv_to_json(csv_path):
    # Read CSV
    df = pd.read_csv(csv_path)
    
    # Create remit and mapping dynamically from CSV columns
    remit, column_to_id_map = create_remit_from_columns(df.columns)
    
    # Create players list
    players = []
    for idx, row in df.iterrows():
        # Split player name into first and family name
        player_name = row['Player'].split()
        if len(player_name) > 1:
            given_name = ' '.join(player_name[:-1])
            family_name = player_name[-1]
        else:
            given_name = ""
            family_name = player_name[0]

        # Get matching values
        values = []
        for col, remit_id in column_to_id_map.items():
            if row[col] == 1:
                values.append(remit_id)

        player = {
            "id": f"{BASE_ID}_{idx + 1}",  # Player IDs also follow the same format
            "f": family_name,
            "g": given_name,
            "v": values
        }
        players.append(player)

    # Create final JSON structure
    json_data = {
        "gameData": {
            "remit": remit,
            "players": players
        }
    }

    # Generate output filename based on BASE_ID
    output_path = f"{BASE_ID}.json"
    
    # Write to file
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(json_data, f, indent=4, ensure_ascii=False)

if __name__ == "__main__":
    convert_csv_to_json("Bingo Cards - Fotbal Comedie - Bingo Card #3.csv")