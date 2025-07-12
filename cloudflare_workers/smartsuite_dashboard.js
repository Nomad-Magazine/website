export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': '*'
    };

    if (request.method === 'OPTIONS')
      return new Response(null, { status: 204, headers: cors });

    const url = new URL(request.url);
    const path = url.pathname;

    // Serve the dashboard HTML
    if (request.method === 'GET' && path === '/') {
      return new Response(getDashboardHTML(), {
        headers: { ...cors, 'Content-Type': 'text/html' }
      });
    }

    // Handle API endpoints
    if (request.method === 'POST') {
      try {
        if (!env.GITHUB_TOKEN) {
          return new Response(JSON.stringify({ error: 'GitHub token not configured' }), {
            status: 500,
            headers: { ...cors, 'Content-Type': 'application/json' }
          });
        }

        const action = path.replace(/^\/+/, '') || 'sync-directory';
        // Trigger GitHub action
        const gh = await fetch(
          'https://api.github.com/repos/Nomad-Magazine/website/dispatches',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${env.GITHUB_TOKEN}`,
              Accept: 'application/vnd.github+json',
              'X-GitHub-Api-Version': '2022-11-28',
              'User-Agent': 'smart-suite-proxy',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ event_type: action })
          }
        );

        if (!gh.ok) {
          const txt = await gh.text();
          console.error('GitHub', gh.status, txt);
          return new Response(JSON.stringify({ error: `GitHub ${gh.status}: ${txt}` }), { 
            status: 500, 
            headers: { ...cors, 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({ success: true, action }), { 
          status: 200, 
          headers: { ...cors, 'Content-Type': 'application/json' }
        });
      } catch (err) {
        console.error('Worker', err);
        return new Response(JSON.stringify({ error: `Internal error: ${err.message}` }), { 
          status: 500, 
          headers: { ...cors, 'Content-Type': 'application/json' }
        });
      }
    }

    // Get workflow status
    if (request.method === 'GET' && path === '/status') {
      try {
        if (!env.GITHUB_TOKEN) {
          return new Response(JSON.stringify({ error: 'GitHub token not configured' }), {
            status: 500,
            headers: { ...cors, 'Content-Type': 'application/json' }
          });
        }

        const workflows = await fetch(
          'https://api.github.com/repos/Nomad-Magazine/website/actions/runs?per_page=10',
          {
            headers: {
              Authorization: `Bearer ${env.GITHUB_TOKEN}`,
              Accept: 'application/vnd.github+json',
              'X-GitHub-Api-Version': '2022-11-28',
              'User-Agent': 'smart-suite-proxy'
            }
          }
        );

        if (!workflows.ok) {
          const errorText = await workflows.text();
          console.error('GitHub API error:', workflows.status, errorText);
          throw new Error(`GitHub API error: ${workflows.status} - ${errorText}`);
        }

        const data = await workflows.json();
        return new Response(JSON.stringify(data), {
          headers: { ...cors, 'Content-Type': 'application/json' }
        });
      } catch (err) {
        console.error('Status fetch error', err);
        return new Response(JSON.stringify({ error: `Failed to fetch status: ${err.message}` }), { 
          status: 500, 
          headers: { ...cors, 'Content-Type': 'application/json' }
        });
      }
    }
    return new Response('Not Found', { status: 404, headers: cors });
  }
};

function getDashboardHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nomad Magazine Actions</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
                 body {
             font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
             background: transparent;
             min-height: 100vh;
             margin: 0;
             padding: 0;
         }
         
         .container {
             width: 100%;
             background: transparent;
         }
        
        .header {
            background: linear-gradient(135deg, #2d3748, #4a5568);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2rem;
            margin-bottom: 8px;
        }
        
        .header p {
            opacity: 0.9;
            font-size: 1.1rem;
        }
        
                 .content {
             padding: 20px;
             background: transparent;
         }
         
         .desktop-layout {
             display: flex;
             gap: 30px;
         }
         
         .actions-section {
             flex: 1;
         }
         
         .status-section {
             flex: 1;
             border-top: none;
             padding-top: 0;
         }
         
         .actions-grid {
             display: grid;
             grid-template-columns: repeat(2, 1fr);
             gap: 20px;
             margin-bottom: 30px;
         }
         
         @media (max-width: 768px) {
             .desktop-layout {
                 flex-direction: column;
             }
             
             .actions-grid {
                 grid-template-columns: 1fr;
             }
             
             .status-section {
                 border-top: 2px solid #e2e8f0;
                 padding-top: 30px;
             }
         }
        
        .action-card {
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            padding: 24px;
            text-align: center;
            transition: all 0.3s ease;
            background: #f8fafc;
        }
        
        .action-card:hover {
            border-color: #667eea;
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.15);
        }
        
        .action-card h3 {
            color: #2d3748;
            margin-bottom: 12px;
            font-size: 1.2rem;
        }
        
        .action-card p {
            color: #718096;
            margin-bottom: 20px;
            line-height: 1.5;
        }
        
        .action-btn {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 1rem;
            width: 100%;
        }
        
        .action-btn:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        
                 .action-btn:disabled {
             opacity: 0.6;
             cursor: not-allowed;
         }
         
         .status-section h2 {
            color: #2d3748;
            margin-bottom: 20px;
            font-size: 1.5rem;
        }
        
        .workflow-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            margin-bottom: 12px;
            background: #f8fafc;
        }
        
        .workflow-info {
            flex: 1;
        }
        
        .workflow-name {
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 4px;
        }
        
        .workflow-time {
            font-size: 0.9rem;
            color: #718096;
        }
        
        .status-badge {
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .status-completed { background: #c6f6d5; color: #2f855a; }
        .status-in_progress { background: #fed7d7; color: #c53030; }
        .status-queued { background: #feebc8; color: #dd6b20; }
        .status-failure { background: #fed7d7; color: #c53030; }
        
        .loader {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 2px solid #f3f3f3;
            border-top: 2px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-right: 8px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .refresh-btn {
            background: #4a5568;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.9rem;
            margin-bottom: 20px;
        }
        
        .refresh-btn:hover {
            background: #2d3748;
        }
        
        .loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }
        
        .loading-content {
            background: white;
            padding: 40px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        }
        
        .success-message {
            background: #c6f6d5;
            color: #2f855a;
            padding: 12px 20px;
            border-radius: 8px;
            margin: 20px 0;
            display: none;
        }
        
        .error-message {
            background: #fed7d7;
            color: #c53030;
            padding: 12px 20px;
            border-radius: 8px;
            margin: 20px 0;
            display: none;
        }
    </style>
</head>
<body>
    <div class="container">
                 <div class="content">
             <div class="success-message" id="successMessage"></div>
             <div class="error-message" id="errorMessage"></div>
             
             <div class="desktop-layout">
                 <div class="actions-section">
                     <h2 style="color: #2d3748; margin-bottom: 20px; font-size: 1.5rem;">Actions</h2>
                     <div class="actions-grid">
                         <div class="action-card">
                             <h3>🚀 Deploy</h3>
                             <p>Build and deploy the latest version to production</p>
                             <button class="action-btn" onclick="triggerAction('sync-deploy')">
                                 Deploy
                             </button>
                         </div>
                         
                         <div class="action-card">
                             <h3>📁 Sync Directory</h3>
                             <p>Synchronize content and update the website directory structure</p>
                             <button class="action-btn" onclick="triggerAction('sync-directory')">
                                 Sync Directory
                             </button>
                         </div>
                         
                         <div class="action-card">
                             <h3>📅 Sync Events</h3>
                             <p>Synchronize events data and update event listings</p>
                             <button class="action-btn" onclick="triggerAction('sync-event')">
                                 Sync Events
                             </button>
                         </div>
                         
                         <div class="action-card">
                             <h3>🏢 Sync Distributors</h3>
                             <p>Synchronize distributor information and update listings</p>
                             <button class="action-btn" onclick="triggerAction('sync_distributor')">
                                 Sync Distributors
                             </button>
                         </div>
                     </div>
                 </div>
                 
                 <div class="status-section">
                     <h2>Recent Workflows</h2>
                     <button class="refresh-btn" onclick="loadWorkflows()">🔄 Refresh Status</button>
                     <div id="workflowsList">
                         <div style="text-align: center; padding: 40px; color: #718096;">
                             Loading workflows...
                         </div>
                     </div>
                 </div>
             </div>
         </div>
    </div>
    
    <div class="loading-overlay" id="loadingOverlay">
        <div class="loading-content">
            <div class="loader"></div>
            <h3 style="margin-top: 20px; color: #2d3748;">Triggering Action...</h3>
            <p style="color: #718096; margin-top: 8px;">Please wait while we start the workflow</p>
        </div>
    </div>

    <script>
        let workflowRefreshInterval;
        
        async function triggerAction(action) {
            const overlay = document.getElementById('loadingOverlay');
            const successMsg = document.getElementById('successMessage');
            const errorMsg = document.getElementById('errorMessage');
            
            // Hide previous messages
            successMsg.style.display = 'none';
            errorMsg.style.display = 'none';
            
            // Show loading overlay
            overlay.style.display = 'flex';
            
            try {
                const response = await fetch('/' + action, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    successMsg.textContent = \`✅ Successfully triggered: \${action}\`;
                    successMsg.style.display = 'block';
                    
                    // Refresh workflows after a short delay
                    setTimeout(() => {
                        loadWorkflows();
                    }, 2000);
                } else {
                    throw new Error(result.error || 'Unknown error');
                }
            } catch (error) {
                console.error('Error triggering action:', error);
                errorMsg.textContent = \`❌ Error: \${error.message}\`;
                errorMsg.style.display = 'block';
            } finally {
                overlay.style.display = 'none';
            }
        }
        
        async function loadWorkflows() {
            const workflowsList = document.getElementById('workflowsList');
            
            try {
                const response = await fetch('/status');
                const data = await response.json();
                
                if (data.workflow_runs && data.workflow_runs.length > 0) {
                    workflowsList.innerHTML = data.workflow_runs.slice(0, 8).map(workflow => {
                        const status = workflow.status === 'completed' ? 
                            (workflow.conclusion === 'success' ? 'completed' : 'failure') : 
                            workflow.status;
                        
                        const timeAgo = getTimeAgo(new Date(workflow.created_at));
                        
                        return \`
                            <div class="workflow-item">
                                <div class="workflow-info">
                                    <div class="workflow-name">\${workflow.name || 'Workflow'}</div>
                                    <div class="workflow-time">\${timeAgo}</div>
                                </div>
                                <div class="status-badge status-\${status}">
                                    \${status === 'in_progress' ? '<span class="loader"></span>' : ''}\${status.replace('_', ' ')}
                                </div>
                            </div>
                        \`;
                    }).join('');
                } else {
                    workflowsList.innerHTML = '<div style="text-align: center; padding: 40px; color: #718096;">No recent workflows found</div>';
                }
            } catch (error) {
                console.error('Error loading workflows:', error);
                workflowsList.innerHTML = '<div style="text-align: center; padding: 40px; color: #e53e3e;">Failed to load workflows</div>';
            }
        }
        
        function getTimeAgo(date) {
            const now = new Date();
            const diffInMs = now - date;
            const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
            const diffInHours = Math.floor(diffInMinutes / 60);
            const diffInDays = Math.floor(diffInHours / 24);
            
            if (diffInMinutes < 1) return 'Just now';
            if (diffInMinutes < 60) return \`\${diffInMinutes}m ago\`;
            if (diffInHours < 24) return \`\${diffInHours}h ago\`;
            return \`\${diffInDays}d ago\`;
        }
        
        // Load workflows on page load
        document.addEventListener('DOMContentLoaded', () => {
            loadWorkflows();
            // Auto-refresh workflows every 30 seconds
            workflowRefreshInterval = setInterval(loadWorkflows, 30000);
        });
        
        // Clean up interval when page unloads
        window.addEventListener('beforeunload', () => {
            if (workflowRefreshInterval) {
                clearInterval(workflowRefreshInterval);
            }
        });
    </script>
</body>
</html>`;
}
