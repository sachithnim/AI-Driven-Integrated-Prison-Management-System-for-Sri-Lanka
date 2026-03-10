from flask import Blueprint, request, jsonify
from app.model import db, User
from werkzeug.security import generate_password_hash, check_password_hash

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({"message": "Username and password are required"}), 400
        
    existing_user = User.query.filter_by(username=username).first()
    if existing_user:
        return jsonify({"message": "Username already exists"}), 409
        
    # Generate hash for security
    hashed_password = generate_password_hash(password)
    
    new_user = User(
        username=username,
        password=hashed_password
    )
    db.session.add(new_user)
    db.session.commit()
    
    # Return a pseudo-token for simple local tracking
    return jsonify({
        "message": "User registered successfully",
        "token": f"mock-jwt-{new_user.id}-{new_user.username}",
        "user": {"id": new_user.id, "username": new_user.username}
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({"message": "Username and password are required"}), 400
        
    user = User.query.filter_by(username=username).first()
    
    if not user or not check_password_hash(user.password, password):
        return jsonify({"message": "Invalid username or password"}), 401
        
    return jsonify({
        "message": "Login successful",
        "token": f"mock-jwt-{user.id}-{user.username}",
        "user": {"id": user.id, "username": user.username}
    }), 200
