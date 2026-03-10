from flask import Blueprint, request, jsonify
from app.model import db, Staff

staff_bp = Blueprint('staff', __name__)

@staff_bp.route('/', methods=['GET'])
def get_staff():
    staff_list = Staff.query.all()
    result = []
    for s in staff_list:
        result.append({
            "id": s.id,
            "name": s.name,
            "role": s.role,
            "department": s.department,
            "contact": s.contact,
            "joined_date": s.joined_date.isoformat() if s.joined_date else None
        })
    return jsonify({"staff": result}), 200

@staff_bp.route('/lookup', methods=['GET'])
def lookup_staff():
    name = request.args.get('name')
    if not name:
        return jsonify({"exists": False}), 200
        
    staff = Staff.query.filter_by(name=name).first()
    if staff:
        return jsonify({
            "exists": True,
            "staff": {
                "id": staff.id,
                "name": staff.name,
                "role": staff.role,
                "department": staff.department,
                "contact": staff.contact
            }
        }), 200
    return jsonify({"exists": False}), 200

@staff_bp.route('/', methods=['POST'])
def add_staff():
    data = request.json
    if not data or not data.get('name') or not data.get('role'):
        return jsonify({"error": "Name and role are required"}), 400
        
    name = data.get('name')
    existing_staff = Staff.query.filter_by(name=name).first()
    
    if existing_staff:
        existing_staff.role = data.get('role')
        existing_staff.department = data.get('department', '')
        existing_staff.contact = data.get('contact', '')
        db.session.commit()
        return jsonify({"message": "Staff member updated successfully", "id": existing_staff.id}), 200
        
    new_staff = Staff(
        name=name,
        role=data.get('role'),
        department=data.get('department', ''),
        contact=data.get('contact', '')
    )
    
    db.session.add(new_staff)
    db.session.commit()
    
    return jsonify({"message": "Staff member added successfully", "id": new_staff.id}), 201
