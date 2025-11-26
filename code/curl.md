# Create alignment task
curl - X POST https://api.audioshake.ai/tasks \\
-H "x-api-key: ${api_key}" \\
-H "Content-Type: application/json" \\
-d '{
"url": "${source_url}",
    "targets": [
        {
            "model": "alignment",
            "formats": ["json"],
            "language": "en"
        }
    ]
  }'

# Get task status
curl https://api.audioshake.ai/tasks/TASK_ID \\
-H "x-api-key: ${api_key}"