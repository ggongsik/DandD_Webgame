# app/main.py

from flask import Blueprint, render_template, redirect, url_for, jsonify, request
from flask_login import current_user, login_required
# ⭐️ Item, Spell, CharacterInventory 모델 임포트
from app.models import db, Character, Item, Spell, CharacterInventory
from collections import Counter # 아이템 수량 비교를 위한 Counter

bp = Blueprint('main', __name__)

@bp.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('main.game'))
    return redirect(url_for('auth.login'))

@bp.route('/game')
@login_required
def game():
    return render_template('index.html')

@bp.route('/api/game_state', methods=['GET'])
@login_required
def get_game_state():
    """ [LOAD] 관계형 DB에서 캐릭터 정보를 읽어 JS가 원하는 JSON으로 변환 """
    character = current_user.character
    if not character:
        return jsonify({"error": "Character not found"}), 404
    
    # character.to_dict()가 동적으로 플래그를 계산하므로 그대로 사용
    return jsonify(character.to_dict())

@bp.route('/api/game_state', methods=['POST'])
@login_required
def save_game_state():
    """ ⭐️ [SAVE] Differential Update / UPSERT 로직 구현 (최소 변경) ⭐️ """
    data = request.json
    character = current_user.character
    
    if not character:
        return jsonify({"error": "Character not found"}), 404
        
    try:
        # 1. Characters 테이블 기본 스탯 업데이트 (최소 변경)
        character.name = data.get('name', character.name)
        stats = data.get('stats', {})
        character.hp = stats.get('hp', character.hp)
        character.mp = stats.get('mp', character.mp)
        character.stat_str = stats.get('str', character.stat_str)
        character.stat_int = stats.get('int', character.stat_int)
        character.stat_dex = stats.get('dex', character.stat_dex)
        character.stat_luk = stats.get('luk', character.stat_luk)
        
        # ⭐️ maxHp/maxMp 포함한 모든 플래그 없는 스탯 업데이트
        character.max_hp = data.get('maxHp', character.max_hp)
        character.max_mp = data.get('maxMp', character.max_mp)
        character.gold = data.get('gold', character.gold)
        character.level = data.get('level', character.level)
        character.xp = data.get('xp', character.xp)
        character.xp_to_next_level = data.get('xpToNextLevel', character.xp_to_next_level)
        character.stat_points = data.get('statPoints', character.stat_points)
        
        # 2. Inventory 업데이트 (UPSERT 로직)
        
        # 2-1. 현재 DB 상태를 {item_name: CharacterInventory Object} 맵으로 변환
        db_inventory_map = {inv.item.name: inv for inv in character.inventory_items}
        
        # 2-2. 클라이언트가 보낸 상태를 {item_name: quantity} 맵으로 집계
        client_counts = Counter(data.get('inventory', []))
        
        # 2-3. 상태 비교 및 최소 변경 실행
        all_item_names = set(db_inventory_map.keys()) | set(client_counts.keys())

        for item_name in all_item_names:
            db_entry = db_inventory_map.get(item_name)
            client_qty = client_counts.get(item_name, 0)
            
            if client_qty > 0 and db_entry:
                # UPDATE: 수량 변경
                if db_entry.quantity != client_qty:
                    db_entry.quantity = client_qty
            
            elif client_qty > 0 and not db_entry:
                # INSERT: 새로 추가
                item_db = Item.query.filter_by(name=item_name).first()
                if item_db:
                    inv_entry = CharacterInventory(
                        character_id=character.id, 
                        item_id=item_db.id, 
                        quantity=client_qty
                    )
                    db.session.add(inv_entry)
            
            elif client_qty == 0 and db_entry:
                # DELETE: 아이템 소진/판매
                db.session.delete(db_entry)


        # 3. Spells 업데이트 (Differential Update)
        
        # 3-1. 현재 DB의 마법 이름 목록
        db_spells = {spell.name for spell in character.spells}
        
        # 3-2. 클라이언트가 보낸 마법 이름 목록
        client_spells = set(data.get('spells', []))
        
        # 3-3. 추가/삭제 비교
        spells_to_add = client_spells - db_spells
        spells_to_remove = db_spells - client_spells
        
        # INSERT (새로 배운 마법)
        for spell_name in spells_to_add:
            spell_db = Spell.query.filter_by(name=spell_name).first()
            if spell_db:
                character.spells.append(spell_db) # SQLAlchemy가 INSERT 처리
                
        # DELETE (잊거나 잃어버린 마법)
        for spell_name in spells_to_remove:
            spell_db = Spell.query.filter_by(name=spell_name).first()
            if spell_db:
                character.spells.remove(spell_db) # SQLAlchemy가 DELETE 처리

        # 4. 모든 변경사항 커밋
        db.session.commit()
        return jsonify({"message": "Game saved successfully (A+ Relational Update)"})

    except Exception as e:
        db.session.rollback()
        print(f"Error during save: {e}")
        return jsonify({"error": "Failed to save game state"}), 500