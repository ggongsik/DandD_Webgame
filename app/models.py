# app/models.py

from app import db
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
import json
from sqlalchemy.orm import relationship, backref # relationship 임포트

# -----------------------------------------------------------------
# ⭐️ 1. M:N 매핑 테이블 (Association Tables) 정의
# -----------------------------------------------------------------
class CharacterInventory(db.Model):
    __tablename__ = 'character_inventory'
    character_id = db.Column(db.Integer, db.ForeignKey('characters.id'), primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey('items.id'), primary_key=True)
    quantity = db.Column(db.Integer, nullable=False, default=1)

    item = relationship('Item', back_populates='characters')
    character = relationship('Character', back_populates='inventory_items')

character_spells = db.Table('character_spells',
    db.Column('character_id', db.Integer, db.ForeignKey('characters.id'), primary_key=True),
    db.Column('spell_id', db.Integer, db.ForeignKey('spells.id'), primary_key=True)
)

# -----------------------------------------------------------------
# ⭐️ 2. 마스터 테이블 (Item / Spell)
# (변경 없음 - 이전 코드 그대로 사용)
# -----------------------------------------------------------------
class Item(db.Model):
    __tablename__ = 'items'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text)
    price = db.Column(db.Integer, default=0)
    
    characters = relationship('CharacterInventory', back_populates='item')

class Spell(db.Model):
    __tablename__ = 'spells'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text)
    mana_cost = db.Column(db.Integer, default=5)
    
    owners = relationship('Character', secondary=character_spells, back_populates='spells')


# -----------------------------------------------------------------
# ⭐️ 3. 기본 테이블 (User / Character)
# -----------------------------------------------------------------
class User(UserMixin, db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), index=True, unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    
    character = relationship('Character', back_populates='user', uselist=False, cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Character(db.Model):
    __tablename__ = 'characters'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False)
    
    name = db.Column(db.String(100), default='플레이어')
    hp = db.Column(db.Integer, default=100)
    mp = db.Column(db.Integer, default=50)
    stat_str = db.Column(db.Integer, default=12)
    stat_int = db.Column(db.Integer, default=14)
    stat_dex = db.Column(db.Integer, default=10)
    stat_luk = db.Column(db.Integer, default=8)
    
    # ⭐️ [추가] 클라이언트 계약 준수 및 데이터 소스 명확화
    max_hp = db.Column(db.Integer, default=100)
    max_mp = db.Column(db.Integer, default=50)
    
    gold = db.Column(db.Integer, default=1000)
    level = db.Column(db.Integer, default=1)
    xp = db.Column(db.Integer, default=0)
    xp_to_next_level = db.Column(db.Integer, default=5)
    stat_points = db.Column(db.Integer, default=0)

    # ❌ [제거] 모든 has_ 플래그 제거 (3NF 준수)
    
    user = relationship('User', back_populates='character')
    inventory_items = relationship('CharacterInventory', back_populates='character', cascade="all, delete-orphan")
    spells = relationship('Spell', secondary=character_spells, back_populates='owners')

    def to_dict(self):
        """ JS의 Player.fromPlainObject()가 요구하는 형태를 동적으로 생성 """
        
        # 1. 인벤토리 목록 생성 (수량 기반 이름 목록)
        inventory_list = []
        for inv_item in self.inventory_items:
            # item 객체와 quantity를 사용하여 비정규화된 이름 목록 생성
            if inv_item.item:
                inventory_list.extend([inv_item.item.name] * inv_item.quantity)
        
        # 2. ⭐️ [핵심] 플래그 동적 계산: 인벤토리를 조회하여 플래그를 생성합니다.
        has_items = {item.item.name: True for item in self.inventory_items}

        return {
            "name": self.name,
            "stats": {
                "hp": self.hp, "mp": self.mp, "str": self.stat_str,
                "int": self.stat_int, "dex": self.stat_dex, "luk": self.stat_luk,
            },
            "maxHp": self.max_hp,
            "maxMp": self.max_mp,
            "gold": self.gold,
            "inventory": inventory_list,
            "spells": [spell.name for spell in self.spells],
            "level": self.level,
            "xp": self.xp,
            "xpToNextLevel": self.xp_to_next_level,
            "statPoints": self.stat_points,
            
            # ⭐️ 동적 플래그 반환 (3NF를 지키면서 프론트엔드 호환성 유지)
            "hasRobberKnife": has_items.get('노상강도의 칼', False),
            "hasExcalibur": has_items.get('엑스칼리버', False),
            "hasCometAxe": has_items.get('혜성의 도끼', False),
            "hasYamato": has_items.get('야마토', False),
            "hasCheontweseongdo": has_items.get('천퇴성도', False),
        }