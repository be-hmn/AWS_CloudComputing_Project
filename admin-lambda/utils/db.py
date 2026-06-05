import boto3
import os
from typing import Dict, Any, Optional, List

dynamodb = boto3.resource('dynamodb')
requests_table = dynamodb.Table(os.environ['REQUESTS_TABLE_NAME'])
users_table = dynamodb.Table(os.environ['USERS_TABLE_NAME'])

def get_requests_by_status(status: str) -> List[Dict[str, Any]]:
    """상태별 상담 신청 조회 (GSI: status-index)"""
    try:
        response = requests_table.query(
            IndexName='status-index',
            KeyConditionExpression='#status = :status',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={':status': status}
        )
        return response.get('Items', [])
    except Exception as e:
        print(f"Error getting requests by status: {str(e)}")
        raise

def get_all_requests() -> List[Dict[str, Any]]:
    """모든 상담 신청 조회"""
    try:
        response = requests_table.scan()
        items = response.get('Items', [])

        # pagination 처리
        while 'LastEvaluatedKey' in response:
            response = requests_table.scan(
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            items.extend(response.get('Items', []))

        return items
    except Exception as e:
        print(f"Error getting all requests: {str(e)}")
        raise

def get_mentor_stats(mentor_id: str) -> Dict[str, Any]:
    """멘토별 배정 건수와 상담 완료 건수 조회"""
    try:
        # mentor-index GSI를 사용하여 멘토에게 배정된 모든 상담 조회
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

        # 상태별로 분류
        assigned_count = len([item for item in items if item.get('status') == 'ASSIGNED'])
        confirmed_count = len([item for item in items if item.get('status') == 'CONFIRMED'])
        completed_count = len([item for item in items if item.get('status') == 'COMPLETED'])
        rejected_count = len([item for item in items if item.get('status') == 'REJECTED'])

        return {
            'mentor_id': mentor_id,
            'total_assigned': assigned_count + confirmed_count + completed_count,
            'total_completed': completed_count,
            'by_status': {
                'ASSIGNED': assigned_count,
                'CONFIRMED': confirmed_count,
                'COMPLETED': completed_count,
                'REJECTED': rejected_count
            }
        }
    except Exception as e:
        print(f"Error getting mentor stats: {str(e)}")
        raise

def get_mentee_requests(mentee_id: str) -> List[Dict[str, Any]]:
    """특정 멘티의 신청 이력 조회 (GSI: mentee-index)"""
    try:
        response = requests_table.query(
            IndexName='mentee-index',
            KeyConditionExpression='mentee_user_id = :mentee_id',
            ExpressionAttributeValues={':mentee_id': mentee_id}
        )

        items = response.get('Items', [])

        # pagination 처리
        while 'LastEvaluatedKey' in response:
            response = requests_table.query(
                IndexName='mentee-index',
                KeyConditionExpression='mentee_user_id = :mentee_id',
                ExpressionAttributeValues={':mentee_id': mentee_id},
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            items.extend(response.get('Items', []))

        return items
    except Exception as e:
        print(f"Error getting mentee requests: {str(e)}")
        raise

def get_all_mentors(active_filter: str = '') -> List[Dict[str, Any]]:
    """전체 멘토 목록 조회 (운영자용) - active 필터 선택적 적용"""
    try:
        response = users_table.query(
            IndexName='role-index',
            KeyConditionExpression='#role = :role',
            ExpressionAttributeNames={'#role': 'role'},
            ExpressionAttributeValues={':role': 'mentor'}
        )
        items = response.get('Items', [])

        while 'LastEvaluatedKey' in response:
            response = users_table.query(
                IndexName='role-index',
                KeyConditionExpression='#role = :role',
                ExpressionAttributeNames={'#role': 'role'},
                ExpressionAttributeValues={':role': 'mentor'},
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            items.extend(response.get('Items', []))

        # active 필터 적용
        if active_filter == 'true':
            items = [m for m in items if m.get('mentor_active', False)]
        elif active_filter == 'false':
            items = [m for m in items if not m.get('mentor_active', False)]

        # 민감 정보 제거 후 반환
        return [
            {k: v for k, v in mentor.items() if k != 'password_hash'}
            for mentor in items
        ]
    except Exception as e:
        print(f"Error getting all mentors: {str(e)}")
        raise
