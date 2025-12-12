# app/main.py

from flask import Blueprint, render_template, redirect, url_for, jsonify, request
from flask_login import current_user, login_required
# ⭐️ Item, Spell, CharacterInventory 모델 임포트
from app.models import db, Character, Item, Spell, CharacterInventory
from collections import Counter # 아이템 수량 비교를 위한 Counter
from sqlalchemy.dialects.sqlite import insert as sqlite_upsert # ⭐️ 핵심
from sqlalchemy import delete


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
        
       # 1. DB Hit 최소화를 위해 아이템 ID 맵핑을 한 번에 가져옴 (쿼리 1회)
        all_items = db.session.query(Item.id, Item.name).all()
        item_map = {name: id for id, name in all_items}

        upsert_data = [] 
        valid_item_ids = set()

        # 클라이언트 데이터를 DB 입력용 리스트로 변환 (메모리 연산)
        client_inv_names = data.get('inventory', [])
        client_counts = Counter(client_inv_names)

        for name, qty in client_counts.items():
            if name in item_map:
                item_id = item_map[name]
                valid_item_ids.add(item_id)
                upsert_data.append({
                    "character_id": character.id,
                    "item_id": item_id,
                    "quantity": qty
                })

        # 2. Bulk UPSERT (쿼리 1회 실행)
        if upsert_data:
            # "넣어라(INSERT). 만약 PK가 겹치면 수량만 업데이트(UPDATE) 해라."
            stmt = sqlite_upsert(CharacterInventory).values(upsert_data)
            stmt = stmt.on_conflict_do_update(
                index_elements=['character_id', 'item_id'], # 충돌 감지 기준
                set_=dict(quantity=stmt.excluded.quantity)  # 덮어쓸 값
            )
            db.session.execute(stmt)

        # 3. Bulk DELETE (쿼리 1회 실행)
        # "이번 요청에 포함되지 않은 아이템은 인벤토리에서 삭제한다."
        if valid_item_ids:
            delete_stmt = delete(CharacterInventory).where(
                CharacterInventory.character_id == character.id,
                CharacterInventory.item_id.notin_(valid_item_ids)
            )
        else:
            # 인벤토리가 비었으면 싹 비움
            delete_stmt = delete(CharacterInventory).where(
                CharacterInventory.character_id == character.id
            )
        db.session.execute(delete_stmt)

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