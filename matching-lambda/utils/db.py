import boto3
import os
from typing import Dict, Any, Optional, List

dynamodb = boto3.resource('dynamodb')
requests_table = dynamodb.Table(os.environ['REQUESTS_TABLE_NAME'])
users_table = dynamodb.Table(os.environ['USERS_TABLE_NAME'])

def get_request_by_id(request_id: str) -> Optional[Dict[str, Any]]:
    """상담 신청 조회"""
    try:
        response = requests_table.get_item(Key={'request_id': request_id})
        return response.get('Item')
    except Exception as e:
        print(f"Error getting request: {str(e)}")
        raise

def get_all_mentors() -> List[Dict[str, Any]]:
    """모든 멘토 조회 (role = MENTOR, mentor_active = true)"""
    try:
        # GSI: role-index에서 role = mentor인 사용자 조회
        response = users_table.query(
            IndexName='role-index',
            KeyConditionExpression='#role = :role',
            ExpressionAttributeNames={'#role': 'role'},
            ExpressionAttributeValues={':role': 'mentor'}
        )

        items = response.get('Items', [])

        # mentor_active = true인 멘토만 필터링
        active_mentors = [item for item in items if item.get('mentor_active', False)]

        # pagination 처리
        while 'LastEvaluatedKey' in response:
            response = users_table.query(
                IndexName='role-index',
                KeyConditionExpression='#role = :role',
                ExpressionAttributeNames={'#role': 'role'},
                ExpressionAttributeValues={':role': 'mentor'},
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            items = response.get('Items', [])
            active_mentors.extend([item for item in items if item.get('mentor_active', False)])

        return active_mentors
    except Exception as e:
        print(f"Error getting all mentors: {str(e)}")
        raise

def get_mentor_active_requests_count(mentor_id: str) -> int:
    """멘토의 진행 중인 상담 건수 조회 (ASSIGNED, CONFIRMED)"""
    try:
        response = requests_table.query(
            IndexName='mentor-index',
            KeyConditionExpression='mentor_user_id = :mentor_id',
            ExpressionAttributeValues={':mentor_id': mentor_id}
        )

        items = response.get('Items', [])

        # pagination 처리
        while 'LastEvaluatedKey' in response:
            response = requests_table.query(
                IndexName='mentor-index',
                KeyConditionExpression='mentor_user_id = :mentor_id',
                ExpressionAttributeValues={':mentor_id': mentor_id},
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            items.extend(response.get('Items', []))

        # status가 ASSIGNED 또는 CONFIRMED인 건수
        active_count = len([
            item for item in items
            if item.get('status') in ['ASSIGNED', 'CONFIRMED']
        ])

        return active_count
    except Exception as e:
        print(f"Error getting mentor active requests count: {str(e)}")
        raise


def get_mentor_confirmed_requests(mentor_id: str) -> List[Dict[str, Any]]:
    """멘토의 CONFIRMED(일정 확정) 상담 목록 조회 - 시간 충돌 검사용"""
    try:
        response = requests_table.query(
            IndexName='mentor-index',
            KeyConditionExpression='mentor_user_id = :mentor_id',
            ExpressionAttributeValues={':mentor_id': mentor_id}
        )

        items = response.get('Items', [])

        while 'LastEvaluatedKey' in response:
            response = requests_table.query(
                IndexName='mentor-index',
                KeyConditionExpression='mentor_user_id = :mentor_id',
                ExpressionAttributeValues={':mentor_id': mentor_id},
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            items.extend(response.get('Items', []))

        # CONFIRMED 상태이고 schedule이 있는 것만 반환
        return [
            item for item in items
            if item.get('status') == 'CONFIRMED' and item.get('schedule')
        ]
    except Exception as e:
        print(f"Error getting mentor confirmed requests: {str(e)}")
        raise
