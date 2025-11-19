# run.py

from app import create_app, db
# ⭐️ Item, Spell 모델을 임포트합니다.
from app.models import User, Character, Item, Spell 

app = create_app()

def seed_database():
    """ DB에 '마스터 데이터' (아이템, 마법)가 없으면 초기화합니다. """
    with app.app_context(): # Context가 이미 run.py 메인 블록에 있으므로 제거.
        if Item.query.first() is None:
            print("Seeding Items...")
            items_data = [
                {'name': '체력 물약', 'price': 80, 'description': '체력을 50 회복합니다.'},
                {'name': '마나 물약', 'price': 60, 'description': '마나를 30 회복합니다.'},
                {'name': '근력 물약', 'price': 50, 'description': '근력을 1 올립니다.'},
                {'name': '지성 물약', 'price': 50, 'description': '지성을 1 올립니다.'},
                {'name': '민첩 물약', 'price': 50, 'description': '민첩을 1 올립니다.'},
                {'name': '재주 물약', 'price': 50, 'description': '재주를 1 올립니다.'},
                {'name': '튼튼한 가죽 갑옷', 'price': 300, 'description': '최대 체력 +5, 근력 +1.'},
                {'name': '양피지: 발화마검술', 'price': 250, 'description': '마법 [발화마검술] 습득'},
                {'name': '양피지: 집중', 'price': 200, 'description': '마법 [집중] 습득'},
                {'name': '양피지: 신속의 주문', 'price': 300, 'description': '마법 [신속의 주문] 습득'},
                {'name': '양피지: 출혈마검술', 'price': 350, 'description': '마법 [출혈마검술] 습득'},
                {'name': '양피지: 혜성', 'price': 1000, 'description': '마법 [혜성] 습득'},
                # ⭐️ has_ 플래그가 DB에서 제거되었으므로, 관련 아이템도 Item 테이블에만 존재합니다.
                {'name': '노상강도의 칼', 'price': 0, 'description': '공격 시 출혈을 유발합니다.'},
                {'name': '혜성의 도끼', 'price': 0, 'description': '우주의 기운이 느껴집니다.'},
                {'name': '야마토', 'price': 0, 'description': '푸른 빛을 내는 카타나.'},
                {'name': '천퇴성도', 'price': 0, 'description': '뇌횡이 사용하던 거대한 도.'},
                {'name': '엑스칼리버', 'price': 0, 'description': '전설의 검.'},
            ]
            for data in items_data:
                db.session.add(Item(**data))
            db.session.commit()

        if Spell.query.first() is None:
            print("Seeding Spells...")
            spells_data = [
                {'name': '불태우기', 'mana_cost': 5, 'description': '6면체 주사위 + (지력/7) 피해, 확률적 화상'},
                {'name': '발화마검술', 'mana_cost': 10, 'description': '다음 공격 적중 시 화상 부여'},
                {'name': '집중', 'mana_cost': 5, 'description': '1턴간 재주+30, 다음 공격 필중'},
                {'name': '신속의 주문', 'mana_cost': 5, 'description': '5턴간 민첩+5'},
                {'name': '출혈마검술', 'mana_cost': 10, 'description': '다음 공격에 출혈 효과 부여/강화'},
                {'name': '혜성', 'mana_cost': 30, 'description': '1턴 후 대상에게 혜성을 떨어뜨려 복합 피해'},
                {'name': '초절맹호살격난참', 'mana_cost': 50, 'description': '적에게 5회의 연속 공격을 가합니다.'},
            ]
            for data in spells_data:
                db.session.add(Spell(**data))
            db.session.commit()

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        seed_database()
    app.run(debug=True)