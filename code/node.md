
/**
 * NodeJS Polling example test.mjs 
 * requires Node v18+
 */

// Create alignment task and poll for completion
const API_KEY = '${api_key}';
const SourceURL = '${source_url}';

// Helper function to check task status
async function getTaskStatus(taskId) {
    const response = await fetch(\`https://api.audioshake.ai/tasks/\${taskId}\`, {
        headers: { 'x-api-key': API_KEY }
    });
    
    if (!response.ok) {
        throw new Error(\`Failed to get task status: \${response.status}\`);
    }
    
    return await response.json();
}

// Polling function
async function pollTask(taskId, maxAttempts = 60, interval = 5000) {
    let attempts = 0;
    
    return new Promise((resolve, reject) => {
        const poll = async () => {
            try {
                attempts++;
                console.log(\`📊 Polling attempt \${attempts}/\${maxAttempts}...\`);
                
                const task = await getTaskStatus(taskId);
                
                // Find the alignment target
                const target = task.targets?.find(t => t.model === 'alignment');
                
                if (!target) {
                    reject(new Error('No alignment target found'));
                    return;
                }
                
                console.log(\`   Status: \${target.status}\`);
                if (target.duration) {
                    console.log(\`   Duration: \${target.duration.toFixed(2)}s\`);
                }
                
                if (target.status === 'completed') {
                    console.log('✅ Task completed!');
                    resolve(task);
                } else if (target.status === 'failed') {
                    reject(new Error(target.error || 'Task failed'));
                } else if (attempts >= maxAttempts) {
                    reject(new Error('Polling timeout - task still processing'));
                } else {
                    setTimeout(poll, interval);
                }
            } catch (err) {
                reject(err);
            }
        };
        
        poll();
    });
}

// Main execution
(async () => {
    try {
        // Step 1: Create the task
        console.log('🚀 Creating alignment task...');
        const response = await fetch('https://api.audioshake.ai/tasks', {
            method: 'POST',
            headers: {
                'x-api-key': API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: SourceURL,
                targets: [
                    {
                        model: 'alignment',
                        formats: ['json'],
                        language: 'en'
                    }
                ]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(\`API Error (\${response.status}): \${errorText}\`);
        }

        const task = await response.json();
        console.log('✅ Task created successfully!');
        console.log('📝 Task ID:', task.id);
        console.log('');

        // Step 2: Poll for completion
        console.log('⏳ Waiting for task to complete...');
        const completedTask = await pollTask(task.id);
        
        // Step 3: Get the result
        const alignmentTarget = completedTask.targets.find(t => t.model === 'alignment');
        const output = alignmentTarget.output.find(o => o.format === 'json');
        
        console.log('');
        console.log('🎉 Success!');
        console.log('📥 Alignment JSON URL:', output.link);
        console.log('💰 Cost:', alignmentTarget.cost, 'credits');
        console.log(\`⏱️  Duration: \${alignmentTarget.duration.toFixed(2)} seconds\`);
        
        // Optional: Fetch the alignment data
        console.log('');
        console.log('📄 Fetching alignment data...');
        const alignmentResponse = await fetch(output.link);
        const alignmentData = await alignmentResponse.json();
        console.log('Alignment data:', JSON.stringify(alignmentData, null, 2));
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
})();
