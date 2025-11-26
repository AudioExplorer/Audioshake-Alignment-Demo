import requests
import time

# Create alignment task
response = requests.post(
    'https://api.audioshake.ai/tasks',
    headers={
        'x-api-key': '${api_key}',
        'Content-Type': 'application/json'
    },
    json={
        'url': '${source_url}',
        'targets': [
            {
                'model': 'alignment',
                'formats': ['json'],
                'language': 'en'
            }
        ]
    }
)

task = response.json()
task_id = task['id']

# Poll for completion
while True:
    status = requests.get(
        f'https://api.audioshake.ai/tasks/{task_id}',
        headers={'x-api-key': '${api_key}'}
    ).json()
    
    # Find alignment target
    alignment_target = next(t for t in status['targets'] if t['model'] == 'alignment')
    
    if alignment_target['status'] == 'completed':
        output = next(o for o in alignment_target['output'] if o['format'] == 'json')
        print('Alignment URL:', output['link'])
        break
    
    time.sleep(2);
