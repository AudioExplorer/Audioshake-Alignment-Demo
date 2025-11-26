// Define checkStatus BEFORE using it

const checkStatus = async (taskId) => {
    
    const response = await fetch(`https://api.audioshake.ai/tasks/${taskId}`, {
        headers: { 'x-api-key': '${api_key}' }
    });
    const task = await response.json();
    
    // Find alignment target
    const alignmentTarget = task.targets.find(t => t.model === 'alignment');
    if (alignmentTarget && alignmentTarget.status === 'completed') {
        const output = alignmentTarget.output.find(o => o.format === 'json');
        console.log('Alignment URL:', output.link);
    }
    return task;
};

// Create alignment task
const response = await fetch('https://api.audioshake.ai/tasks', {
    method: 'POST',
    headers: {
        'x-api-key': '${api_key}',
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        url: '${asset_url}',
        targets: [
            {
                model: 'alignment',
                formats: ['json'],
                language: 'en'
            }
        ]
    })
});

const task = await response.json();
console.log('Full response:', task); // Log full response to debug
console.log('Task ID:', task.id);

if (task.id) {
    const pollResult = await checkStatus(task.id);
    console.log('Running Task ID:', pollResult.id);
} else {
    console.error('No task ID received. Check API response:', task);
}