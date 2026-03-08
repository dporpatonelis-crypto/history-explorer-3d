# Scenarios

Place JSON scenario files here. The app will try to load `default.json` on startup.
If not found, it falls back to the hardcoded NPC data.

## JSON Structure

```json
{
  "characters": [
    {
      "id": "socrates",
      "name": "Σωκράτης",
      "title": "Ο Φιλόσοφος της Αθήνας",
      "position_x": -3.5,
      "position_y": 0,
      "position_z": -1.5,
      "rotation": 0.3,
      "color": "#d4a574",
      "robeColor": "#f5f0e8",
      "description": "Ο πατέρας της δυτικής φιλοσοφίας.",
      "glbModel": ""
    }
  ],
  "dialogs": [
    {
      "character_id": "socrates",
      "question": "Ποια είναι η σωκρατική μέθοδος;",
      "answer": "Η σωκρατική μέθοδος είναι..."
    }
  ],
  "facts": [
    {
      "character_id": "socrates",
      "fact": "Γεννήθηκε το 470 π.Χ. στην Αθήνα"
    }
  ]
}
```

## Google Sheet → JSON workflow

1. Create a Google Sheet with 3 tabs: `characters`, `dialogs`, `facts`
2. Use the column names above as headers
3. Export each tab as CSV
4. Convert to a single JSON (or use a script)
5. Save as `public/scenarios/default.json`
6. Push to GitHub → auto-syncs to Lovable
