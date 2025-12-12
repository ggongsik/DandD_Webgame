# run.py

from app import create_app, db
from app.models import User, Character, Item, Spell 

app = create_app()

def seed_database():
    """ 
    DB에 필요한 마스터 데이터(아이템, 마법)가 존재하는지 하나씩 확인하고,
    없는 경우에만 추가합니다. (DB 초기화 로직 개선)
    """
    with app.app_context():
        # 1. 아이템 데이터 확인 및 추가
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
            # 전설 아이템들
            {'name': '노상강도의 칼', 'price': 0, 'description': '공격 시 출혈을 유발합니다.'},
            {'name': '혜성의 도끼', 'price': 0, 'description': '우주의 기운이 느껴집니다.'},
            {'name': '야마토', 'price': 0, 'description': '푸른 빛을 내는 카타나.'},
            {'name': '천퇴성도', 'price': 0, 'description': '뇌횡이 사용하던 거대한 박도.'},
            {'name': '엑스칼리버', 'price': 0, 'description': '전설의 검.'},
        ]

        print("Checking Items...")
        for data in items_data:
            # 이름으로 DB 조회 후 없으면 추가
            if not Item.query.filter_by(name=data['name']).first():
                print(f"Adding missing item: {data['name']}")
                db.session.add(Item(**data))
        
        # 2. 마법 데이터 확인 및 추가
        spells_data = [
            {'name': '불태우기', 'mana_cost': 5, 'description': '6면체 주사위 + (지력/7) 피해, 확률적 화상'},
            {'name': '발화마검술', 'mana_cost': 10, 'description': '다음 공격 적중 시 화상 부여'},
            {'name': '집중', 'mana_cost': 5, 'description': '1턴간 재주+30, 다음 공격 필중'},
            {'name': '신속의 주문', 'mana_cost': 5, 'description': '5턴간 민첩+5'},
            {'name': '출혈마검술', 'mana_cost': 10, 'description': '다음 공격에 출혈 효과 부여/강화'},
            {'name': '혜성', 'mana_cost': 30, 'description': '1턴 후 대상에게 혜성을 떨어뜨려 복합 피해'},
            {'name': '다가오는 폭풍', 'mana_cost': 60, 'description': '기본 공격의 15% 데미지로 20회 확정 치명타 공격. (온히트 적용)'},
            {'name': '초절맹호살격난참', 'mana_cost': 50, 'description': '적에게 5회의 연속 공격을 가합니다.'},
        ]

        print("Checking Spells...")
        for data in spells_data:
            if not Spell.query.filter_by(name=data['name']).first():
                print(f"Adding missing spell: {data['name']}")
                db.session.add(Spell(**data))

        # 변경사항 한 번에 커밋
        db.session.commit()
        print("Database seeding completed.")

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        seed_database()
    app.run(debug=True)