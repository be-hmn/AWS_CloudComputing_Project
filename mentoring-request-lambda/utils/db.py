import boto3
import os
from datetime import datetime
from typing import Dict, Any, Optional, List
import uuid

dynamodb = boto3.resource('dynamodb')
requests_table = dynamodb.Table(os.environ['REQUESTS_TABLE_NAME'])

def create_request(
    mentee_user_id: str,
    interest_field: str,
    topic: str,
    message: str,
    preferred_date: str = '',
    preferred_time: str = '',
) -> Dict[str, Any]:
    """상담 신청 생성"""
    try:
        request_id = str(uuid.uuid4())
        now = int(datetime.utcnow().timestamp())

        item = {
            'request_id': request_id,
            'mentee_user_id': mentee_user_id,
            'status': 'PENDING',
            'interest_field': interest_field,
            'topic': topic,
            'message': message,
            'created_at': now,
            'updated_at': now
        }

        # 선택 필드는 값이 있을 때만 저장 (DynamoDB는 None 저장 불가)
        if preferred_date:
            item['preferred_date'] = preferred_date
        if preferred_time:
            item['preferred_time'] = preferred_time

        requests_table.put_item(Item=item)
        return item
    except Exception as e:
        print(f"Error creating request: {str(e)}")
        raise

def get_requests_by_mentee(mentee_user_id: str) -> List[Dict[str, Any]]:
    """멘티의 모든 상담 신청 조회 (GSI)"""
    try:
        response = requests_table.query(
            IndexName='mentee-index',
            KeyConditionExpression='mentee_user_id = :mentee_id',
            ExpressionAttributeValues={':mentee_id': mentee_user_id}
        )
        return response.get('Items', [])
    except Exception as e:
        print(f"Error getting requests by mentee: {str(e)}")
        raise

def get_request_by_id(request_id: str) -> Optional[Dict[str, Any]]:
    """상담 신청 상세 조회 (PK)"""
    try:
        response = requests_table.get_item(Key={'request_id': request_id})
        return response.get('Item')
    except Exception as e:
        print(f"Error getting request by id: {str(e)}")
        raise

def cancel_request(request_id: str) -> Dict[str, Any]:
    """상담 신청 취소 - PENDING → CANCELED (이력 보존)"""
    try:
        now = int(datetime.utcnow().timestamp())
        response = requests_table.update_item(
            Key={'request_id': request_id},
            UpdateExpression='SET #status = :status, updated_at = :now',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':status': 'CANCELED',
                ':now': now,
            },
            ReturnValues='ALL_NEW'
        )
        return response.get('Attributes')
    except Exception as e:
        print(f"Error canceling request: {str(e)}")
        raise

def complete_request(request_id: str) -> Dict[str, Any]:
    """상담 완료 처리 - CONFIRMED → COMPLETED"""
    try:
        now = int(datetime.utcnow().timestamp())
        response = requests_table.update_item(
            Key={'request_id': request_id},
            UpdateExpression='SET #status = :status, updated_at = :now',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':status': 'COMPLETED',
                ':now': now,
            },
            ReturnValues='ALL_NEW'
        )
        return response.get('Attributes')
    except Exception as e:
        print(f"Error completing request: {str(e)}")
        raise
