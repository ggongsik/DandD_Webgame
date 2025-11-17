# app/main.py

from flask import Blueprint, render_template, redirect, url_for, jsonify, request
from flask_login import current_user, login_required
# ⭐️ Item, Spell, CharacterInventory 모델 임포트
from app.models import db, Character, Item, Spell, CharacterInventory
from collections import Counter

bp = Blueprint('main', __name__)

@bp.route('/')
def index():
    # ... (기존과 동일)
    if current_user.is_authenticated:
        return redirect(url_for('main.game'))
    return redirect(url_for('auth.login'))

@bp.route('/game')
@login_required
def game():
    # ... (기존과 동일)
    return render_template('index.html')

@bp.route('/api/game_state', methods=['GET'])
@login_required
def get_game_state():
    """ [LOAD] 관계형 DB에서 캐릭터 정보를 읽어 JS가 원하는 JSON으로 변환 """
    character = current_user.character
    if not character:
        return jsonify({"error": "Character not found"}), 404
    
    # ⭐️ character.to_dict()가 모든 M:N 관계를 조회하여 JSON으로 변환해줌
    return jsonify(character.to_dict())

@bp.route('/api/game_state', methods=['POST'])
@login_required
def save_game_state():
    """ [SAVE] JS의 JSON을 받아 관계형 DB에 분해하여 저장 (핵심 로직) """
    data = request.json
    character = current_user.character
    
    if not character:
        return jsonify({"error": "Character not found"}), 404
        
    try:
        # 1. Character 기본 스탯 업데이트 (JSON -> characters 테이블)
        character.name = data.get('name', character.name)
        stats = data.get('stats', {})
        character.hp = stats.get('hp', character.hp)
        character.mp = stats.get('mp', character.mp)
        character.stat_str = stats.get('str', character.stat_str)
        character.stat_int = stats.get('int', character.stat_int)
        character.stat_dex = stats.get('dex', character.stat_dex)
        character.stat_luk = stats.get('luk', character.stat_luk)
        character.max_hp = data.get('maxHp', character.max_hp)
        character.max_mp = data.get('maxMp', character.max_mp)
        character.gold = data.get('gold', character.gold)
        character.level = data.get('level', character.level)
        character.xp = data.get('xp', character.xp)
        character.xp_to_next_level = data.get('xpToNextLevel', character.xp_to_next_level)
        character.stat_points = data.get('statPoints', character.stat_points)
        character.has_robber_knife = data.get('hasRobberKnife', character.has_robber_knife)
        character.has_excalibur = data.get('hasExcalibur', character.has_excalibur)
        character.has_comet_axe = data.get('hasCometAxe', character.has_comet_axe)
        character.has_yamato = data.get('hasYamato', character.has_yamato)
        character.has_cheontweseongdo = data.get('hasCheontweseongdo', character.has_cheontweseongdo)
        
        # 2. Inventory 업데이트 (JSON List -> character_inventory 테이블)
        # 2-1. 기존 인벤토리 삭제
        CharacterInventory.query.filter_by(character_id=character.id).delete()
        
        # 2-2. 새 인벤토리 리스트 집계 (e.g., ["물약", "물약"] -> {"물약": 2})
        inventory_counts = Counter(data.get('inventory', []))
        
        # 2-3. DB 마스터 테이블과 비교하며 INSERT
        for item_name, quantity in inventory_counts.items():
            item_db = Item.query.filter_by(name=item_name).first()
            if item_db:
                inv_entry = CharacterInventory(
                    character_id=character.id, 
                    item_id=item_db.id, 
                    quantity=quantity
                )
                db.session.add(inv_entry)
        
        # 3. Spells 업데이트 (JSON List -> character_spells 테이블)
        # 3-1. 기존 마법 목록 삭제 (SQLAlchemy M:N helper)
        character.spells.clear()
        
        # 3-2. DB 마스터 테이블과 비교하며 INSERT
        for spell_name in data.get('spells', []):
            spell_db = Spell.query.filter_by(name=spell_name).first()
            if spell_db:
                character.spells.append(spell_db)
        
        # 4. 모든 변경사항 커밋
        db.session.commit()
        return jsonify({"message": "Game saved successfully (Relational)"})

    except Exception as e:
        db.session.rollback()
        print(f"Error during save: {e}")
        return jsonify({"error": "Failed to save game state"}), 500