#!python

import http.server
import socketserver
from urllib.parse import urlparse, urlunparse
from os import path

PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_HEAD(self):
        print('head', self.path)
        super().do_HEAD()
    
    def do_GET(self):
        print('get', self.path)
        
        url = urlparse(self.path)
        
        file, ext = path.splitext(url.path)
        
        print(url, file, ext)
        
        if not path.basename(file):
            url = list(url)
            url[2] = 'index.html'
            self.path = urlunparse(url)
        elif not ext:
            url = list(url)
            url[2] += '.html'
            self.path = urlunparse(url)
        
        super().do_GET()

Handler = MyHTTPRequestHandler
Handler.extensions_map.update({
    ".js": "application/x-javascript",
    ".js": "application/x-javascript",
});

with socketserver.TCPServer(("0.0.0.0", PORT), Handler) as httpd:
    print("serving at port", PORT)
    print(Handler.extensions_map[".js"])
    httpd.serve_forever()