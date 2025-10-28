import http.server
import socketserver
import urllib.request
import urllib.parse
import json
from pathlib import Path
from datetime import datetime

PORT = 8001
DATA_DIR = Path(__file__).parent / 'data'

class ProxyHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urllib.parse.urlparse(self.path)
        path_only = parsed_path.path
        
        print(f"[Request] Path: {path_only}")
        
        # API routing
        if path_only == '/api/backlinks':
            self.handle_api_request()
        elif path_only == '/api/domain-metrics':
            print("[Routing] Matched domain-metrics endpoint")
            self.handle_domain_metrics()
        elif path_only.startswith('/api/history/'):
            self.handle_history_request()
        elif path_only == '/api/list-history':
            self.handle_list_history()
        elif path_only == '/api/list-domains':
            self.handle_list_domains()
        else:
            print(f"[Routing] Serving static file: {path_only}")
            super().do_GET()
    
    def handle_api_request(self):
        try:
            parsed_path = urllib.parse.urlparse(self.path)
            query_params = urllib.parse.parse_qs(parsed_path.query)
            
            domain = query_params.get('domain', [''])[0].strip().rstrip('/')
            one_per_domain = query_params.get('onePerDomain', ['0'])[0]
            include_metrics = query_params.get('includeMetrics', ['0'])[0]
            
            if not domain:
                raise ValueError('Domain is required')
            
            api_key_path = Path(__file__).parent / 'api.txt'
            with open(api_key_path, 'r') as f:
                api_key = f.read().strip()
            
            # Fetch backlinks data
            api_params = urllib.parse.urlencode({
                'apikey': api_key,
                'app': 'BacklinksAnalyzer',
                'domain': domain,
                'onePerDomain': one_per_domain
            })
            
            api_url = f'https://domdetailer.com/api2/getBacklinks.php?{api_params}'
            print(f'Fetching backlinks: {api_url}')
            
            req = urllib.request.Request(api_url)
            req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
            
            with urllib.request.urlopen(req, timeout=60) as response:
                backlinks_data = response.read()
                backlinks_json = json.loads(backlinks_data)
            
            final_data = backlinks_data
            
            # Save the data
            self.save_analysis_data(domain, final_data)
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(final_data)
        
        except urllib.error.HTTPError as e:
            print(f'HTTP Error: {e.code} - {e.reason}')
            error_body = e.read().decode('utf-8', errors='ignore')
            print(f'Error body: {error_body}')
            self.send_response(e.code)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(error_body.encode())
        
        except Exception as e:
            print(f'Error: {type(e).__name__} - {str(e)}')
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            error_response = json.dumps({'error': str(e), 'type': type(e).__name__})
            self.wfile.write(error_response.encode())
    
    def save_analysis_data(self, domain, data):
        """Save analysis data to disk"""
        try:
            domain_dir = DATA_DIR / domain
            domain_dir.mkdir(parents=True, exist_ok=True)
            
            timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
            filename = f'{timestamp}.json'
            filepath = domain_dir / filename
            
            # Parse and add metadata
            parsed_data = json.loads(data)
            parsed_data['_metadata'] = {
                'domain': domain,
                'timestamp': timestamp,
                'saved_at': datetime.now().isoformat()
            }
            
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(parsed_data, f, indent=2)
            
            # Update index
            self.update_index(domain, timestamp, filepath)
            print(f'Saved analysis: {filepath}')
        except Exception as e:
            print(f'Error saving data: {e}')
    
    def update_index(self, domain, timestamp, filepath):
        """Update domain index file"""
        try:
            domain_dir = DATA_DIR / domain
            index_file = domain_dir / 'index.json'
            
            if index_file.exists():
                with open(index_file, 'r', encoding='utf-8') as f:
                    index = json.load(f)
            else:
                index = {'domain': domain, 'analyses': []}
            
            index['analyses'].append({
                'timestamp': timestamp,
                'date': datetime.now().isoformat(),
                'filename': filepath.name
            })
            
            # Keep only last 50 entries
            index['analyses'] = index['analyses'][-50:]
            
            with open(index_file, 'w', encoding='utf-8') as f:
                json.dump(index, f, indent=2)
        except Exception as e:
            print(f'Error updating index: {e}')
    
    def handle_list_history(self):
        """List all historical analyses"""
        try:
            parsed_path = urllib.parse.urlparse(self.path)
            query_params = urllib.parse.parse_qs(parsed_path.query)
            domain = query_params.get('domain', [''])[0].strip()
            
            if not domain:
                raise ValueError('Domain is required')
            
            domain_dir = DATA_DIR / domain
            index_file = domain_dir / 'index.json'
            
            if not index_file.exists():
                result = {'domain': domain, 'analyses': []}
            else:
                with open(index_file, 'r', encoding='utf-8') as f:
                    result = json.load(f)
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
        except Exception as e:
            self.send_error_response(str(e))
    
    def handle_history_request(self):
        """Get specific historical analysis"""
        try:
            path_parts = self.path.split('/')
            domain = path_parts[3] if len(path_parts) > 3 else ''
            filename = path_parts[4] if len(path_parts) > 4 else ''
            
            if not domain or not filename:
                raise ValueError('Domain and filename are required')
            
            filepath = DATA_DIR / domain / filename
            
            if not filepath.exists():
                raise FileNotFoundError('Analysis not found')
            
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(data).encode())
        except Exception as e:
            self.send_error_response(str(e))
    
    def handle_list_domains(self):
        """List all analyzed domains"""
        try:
            if not DATA_DIR.exists():
                result = {'domains': []}
            else:
                domains = []
                for domain_dir in DATA_DIR.iterdir():
                    if domain_dir.is_dir():
                        index_file = domain_dir / 'index.json'
                        if index_file.exists():
                            with open(index_file, 'r', encoding='utf-8') as f:
                                index_data = json.load(f)
                                domains.append({
                                    'domain': domain_dir.name,
                                    'analyses_count': len(index_data.get('analyses', [])),
                                    'last_analysis': index_data.get('analyses', [{}])[-1].get('date', '') if index_data.get('analyses') else ''
                                })
                
                # Sort by last analysis date (most recent first)
                domains.sort(key=lambda x: x.get('last_analysis', ''), reverse=True)
                result = {'domains': domains}
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
        except Exception as e:
            self.send_error_response(str(e))
    
    def handle_domain_metrics(self):
        """Handle domain metrics API request (Moz + Majestic + Pretty)"""
        try:
            parsed_path = urllib.parse.urlparse(self.path)
            query_params = urllib.parse.parse_qs(parsed_path.query)
            
            domain = query_params.get('domain', [''])[0].strip().rstrip('/')
            
            if not domain:
                raise ValueError('Domain is required')
            
            api_key_path = Path(__file__).parent / 'api.txt'
            with open(api_key_path, 'r') as f:
                api_key = f.read().strip()
            
            api_params = urllib.parse.urlencode({
                'apikey': api_key,
                'app': 'BacklinksAnalyzer',
                'domain': domain
            })
            
            api_url = f'https://domdetailer.com/api/checkDomain.php?{api_params}'
            print(f'Fetching domain metrics: {api_url}')
            
            req = urllib.request.Request(api_url)
            req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
            
            with urllib.request.urlopen(req, timeout=60) as response:
                data = response.read()
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(data)
        
        except urllib.error.HTTPError as e:
            print(f'HTTP Error: {e.code} - {e.reason}')
            error_body = e.read().decode('utf-8', errors='ignore')
            print(f'Error body: {error_body}')
            self.send_response(e.code)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(error_body.encode())
        
        except Exception as e:
            print(f'Error: {type(e).__name__} - {str(e)}')
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            error_response = json.dumps({'error': str(e), 'type': type(e).__name__})
            self.wfile.write(error_response.encode())
    
    def send_error_response(self, message):
        """Send error response"""
        self.send_response(500)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps({'error': message}).encode())
    
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

if __name__ == '__main__':
    with socketserver.TCPServer(("", PORT), ProxyHandler) as httpd:
        print(f"Server running at http://localhost:{PORT}/")
        print(f"Open http://localhost:{PORT}/index.html in your browser")
        print(f"API Key: Loaded from api.txt")
        httpd.serve_forever()
