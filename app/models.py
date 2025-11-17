# app/models.py

# ⭐️ from app import db, login_manager  <- 이 줄을 아래와 같이 수정
from app import db 
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
import json

# ⭐️ @login_manager.user_loader 로 시작하는 함수 전체를 여기서 삭제합니다.

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), index=True, unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    
    character = db.relationship('Character', back_populates='user', uselist=False, cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Character(db.Model):
    # ... (이하 Character 모델 코드는 변경 없음) ...
    __tablename__ = 'characters'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False)
    
    name = db.Column(db.String(100), default='플레이어')
    
    # Stats
    hp = db.Column(db.Integer, default=100)
    mp = db.Column(db.Integer, default=50)
    stat_str = db.Column(db.Integer, default=12)
    stat_int = db.Column(db.Integer, default=14)
    stat_dex = db.Column(db.Integer, default=10)
    stat_luk = db.Column(db.Integer, default=8)
    
    max_hp = db.Column(db.Integer, default=100)
    max_mp = db.Column(db.Integer, default=50)
    gold = db.Column(db.Integer, default=1000)
    
    # Level / XP
    level = db.Column(db.Integer, default=1)
    xp = db.Column(db.Integer, default=0)
    xp_to_next_level = db.Column(db.Integer, default=5)
    stat_points = db.Column(db.Integer, default=0)

    # Flags
    has_robber_knife = db.Column(db.Boolean, default=False)
    has_excalibur = db.Column(db.Boolean, default=False)
    has_comet_axe = db.Column(db.Boolean, default=False)
    has_yamato = db.Column(db.Boolean, default=False)
    has_cheontweseongdo = db.Column(db.Boolean, default=False)

    inventory_json = db.Column(db.Text, default='[]')
    spells_json = db.Column(db.Text, default='["불태우기"]')

    user = db.relationship('User', back_populates='character')

    def to_dict(self):
        # ... (to_dict 메서드) ...
        return {
            "name": self.name,
            "stats": {
                "hp": self.hp,
                "mp": self.mp,
                "str": self.stat_str,
                "int": self.stat_int,
                "dex": self.stat_dex,
                "luk": self.stat_luk,
            },
            "maxHp": self.max_hp,
            "maxMp": self.max_mp,
            "gold": self.gold,
            "inventory": json.loads(self.inventory_json),
            "spells": json.loads(self.spells_json),
            "level": self.level,
            "xp": self.xp,
            "xpToNextLevel": self.xp_to_next_level,
            "statPoints": self.stat_points,
            "hasRobberKnife": self.has_robber_knife,
            "hasExcalibur": self.has_excalibur,
            "hasCometAxe": self.has_comet_axe,
            "hasYamato": self.has_yamato,
            "hasCheontweseongdo": self.has_cheontweseongdo
        }


    def from_dict(self, data):
        # ... (from_dict 메서드) ...
        self.name = data.get('name', self.name)
        
        stats = data.get('stats', {})
        self.hp = stats.get('hp', self.hp)
        self.mp = stats.get('mp', self.mp)
        self.stat_str = stats.get('str', self.stat_str)
        self.stat_int = stats.get('int', self.stat_int)
        self.stat_dex = stats.get('dex', self.stat_dex)
        self.stat_luk = stats.get('luk', self.stat_luk)

        self.max_hp = data.get('maxHp', self.max_hp)
        self.max_mp = data.get('maxMp', self.max_mp)
        self.gold = data.get('gold', self.gold)
        
        self.inventory_json = json.dumps(data.get('inventory', []))
        self.spells_json = json.dumps(data.get('spells', ["불태우기"]))

        self.level = data.get('level', self.level)
        self.xp = data.get('xp', self.xp)
        self.xp_to_next_level = data.get('xpToNextLevel', self.xp_to_next_level)
        self.stat_points = data.get('statPoints', self.stat_points)
        
        self.has_robber_knife = data.get('hasRobberKnife', self.has_robber_knife)
        self.has_excalibur = data.get('hasExcalibur', self.has_excalibur)
        self.has_comet_axe = data.get('hasCometAxe', self.has_comet_axe)
        self.has_yamato = data.get('hasYamato', self.has_yamato)
        self.has_cheontweseongdo = data.get('hasCheontweseongdo', self.has_cheontweseongdo)