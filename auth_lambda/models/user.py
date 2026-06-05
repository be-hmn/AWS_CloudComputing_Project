import boto3
import os
from datetime import datetime
from typing import Dict, Any, Optional
import uuid

dynamodb = boto3.resource('dynamodb')
users_table = dynamodb.Table(os.environ['USERS_TABLE_NAME'])

class User:
    @staticmethod
    def create_user(
        nickname: str,
        password_hash: str,
        role: str,
        mentor_fields: list = None,
        available_times: dict = None,
        intro: str = None,
        major: str = None,
        interest_fields: list = None
    ) -> Dict[str, Any]:
        """새 사용자 생성"""
        user_id = str(uuid.uuid4())
        now = int(datetime.utcnow().timestamp())

        item = {
            'user_id': user_id,
            'nickname': nickname,
            'password_hash': password_hash,
            'role': role,
            'created_at': now,
            'updated_at': now
        }

        # mentor 추가 필드
        if role == 'mentor':
            item['mentor_fields'] = mentor_fields or []
            item['available_times'] = available_times or {}
            item['intro'] = intro or ''
            item['mentor_active'] = True  # 신규 멘토는 기본 활성 상태

        # mentee 추가 필드
        if role == 'mentee':
            item['major'] = major or ''
            item['interest_fields'] = interest_fields or []

        users_table.put_item(Item=item)
        return item

    @staticmethod
    def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
        """ID로 사용자 조회"""
        response = users_table.get_item(Key={'user_id': user_id})
        return response.get('Item')

    @staticmethod
    def get_user_by_nickname(nickname: str) -> Optional[Dict[str, Any]]:
        """닉네임으로 사용자 조회 (GSI 사용)"""
        response = users_table.query(
            IndexName='nickname-index',
            KeyConditionExpression='nickname = :nickname',
            ExpressionAttributeValues={':nickname': nickname}
        )
        items = response.get('Items', [])
        return items[0] if items else None

    @staticmethod
    def nickname_exists(nickname: str) -> bool:
        """닉네임 중복 확인"""
        user = User.get_user_by_nickname(nickname)
        return user is not None

    @staticmethod
    def update_user(user_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """사용자 정보 수정"""
        updates['updated_at'] = int(datetime.utcnow().timestamp())

        update_expression = 'SET ' + ', '.join([f'{key} = :{key}' for key in updates.keys()])
        expression_attribute_values = {f':{key}': value for key, value in updates.items()}

        response = users_table.update_item(
            Key={'user_id': user_id},
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_attribute_values,
            ReturnValues='ALL_NEW'
        )
        return response.get('Attributes')
