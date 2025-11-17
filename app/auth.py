# app/auth.py

from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_user, logout_user, login_required, current_user
# ⭐️ Item, Spell, CharacterInventory 모델 임포트
from app.models import db, User, Character, Spell
from werkzeug.security import generate_password_hash

bp = Blueprint('auth', __name__)

@bp.route('/login', methods=['GET', 'POST'])
def login():
    # ... (기존과 동일)
    if current_user.is_authenticated:
        return redirect(url_for('main.game'))
    
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        user = User.query.filter_by(username=username).first()
        
        if user is None or not user.check_password(password):
            flash('아이디 또는 비밀번호가 올바르지 않습니다.')
            return redirect(url_for('auth.login'))
        
        login_user(user, remember=True)
        return redirect(url_for('main.game'))
        
    return render_template('login.html')

@bp.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('main.game'))
        
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        user = User.query.filter_by(username=username).first()
        if user:
            flash('이미 존재하는 아이디입니다.')
            return redirect(url_for('auth.register'))
            
        new_user = User(username=username)
        new_user.set_password(password)
        
        new_character = Character(user=new_user)
        
        # ⭐️ [수정] 기본 마법('불태우기')을 DB에서 찾아 연결해줍니다.
        default_spell = Spell.query.filter_by(name='불태우기').first()
        if default_spell:
            new_character.spells.append(default_spell)
        
        db.session.add(new_user)
        db.session.add(new_character)
        db.session.commit()
        
        flash('회원가입이 완료되었습니다! 로그인해주세요.')
        return redirect(url_for('auth.login'))
        
    return render_template('register.html')

@bp.route('/logout')
@login_required
def logout():
    # ... (기존과 동일)
    logout_user()
    return redirect(url_for('auth.login'))