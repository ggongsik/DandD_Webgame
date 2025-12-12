# app/__init__.py

from flask import Flask
from config import Config
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager

db = SQLAlchemy()
login_manager = LoginManager()
login_manager.login_view = 'auth.login'
login_manager.login_message = '로그인이 필요합니다.'

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    app.config['SQLALCHEMY_ECHO'] = True
    db.init_app(app)
    login_manager.init_app(app)

    # 블루프린트 등록
    from app.auth import bp as auth_bp
    app.register_blueprint(auth_bp, url_prefix='/auth')

    from app.main import bp as main_bp
    app.register_blueprint(main_bp)

    # ⭐️⭐️⭐️ 이 부분이 핵심입니다 ⭐️⭐️⭐️
    # 순환 참조를 피하기 위해 create_app 내부에 user_loader를 정의합니다.
    @login_manager.user_loader
    def load_user(user_id):
        # User 모델을 이 시점에서 임포트합니다.
        from app.models import User
        return User.query.get(int(user_id))

    return app