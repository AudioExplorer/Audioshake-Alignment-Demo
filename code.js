// Code Examples

// Each function returns code example for that language with api key and source url injected

async function loadCodeMD(mdfile, YOUR_API_KEY, sourceURL) {
    const response = await fetch(mdfile);   // load file
    const markdown = await response.text();       // read raw MD
    // replace all ${api_key} and ${asset_url}
    let injectedMD = markdown
        .replace(/\$\{api_key\}/g, YOUR_API_KEY)
        .replace(/\$\{asset_url\}/g, sourceURL)

    return injectedMD;
}

async function updateCodeExample(lang) {
    let YOUR_API_KEY = (api.hasAPIKey) ? api.apiKey : "YOUR_API_KEY";
    let sourceURL = (state.selectedAsset != undefined) ? state.selectedAsset.src : 'https://example.com/audio.mp3'

    const examples = {
        swift: await loadCodeMD("./code/swift.md", YOUR_API_KEY, sourceURL),
        javascript: await loadCodeMD("./code/javascript.md", YOUR_API_KEY, sourceURL),
        node: await loadCodeMD("./code/node.md", YOUR_API_KEY, sourceURL),
        curl: await loadCodeMD("./code/curl.md", YOUR_API_KEY, sourceURL),
        python: await loadCodeMD("./code/python.md", YOUR_API_KEY, sourceURL),
    };

    elements.codeContent.textContent = examples[lang] || examples.javascript;
}

function copyCode() {
    const code = elements.codeContent.textContent;
    navigator.clipboard.writeText(code).then(() => {
        const originalText = elements.copyCodeBtn.textContent;
        elements.copyCodeBtn.textContent = 'Copied!';
        setTimeout(() => {
            elements.copyCodeBtn.textContent = originalText;
        }, 2000);
    });
}


