from app import create_app
from dotenv import load_dotenv
import os

load_dotenv() 

app = create_app()

if __name__ == '__main__':
    # We must exclude .db files from the reloader, otherwise Werkzeug 
    # instantly kills the server mid-response during POST database commits!
    app.run(
        host='0.0.0.0', 
        port=5010, 
        debug=True,
        extra_files=None,
        exclude_patterns=['*.db', '*.db-journal', '*.sqlite3']
    )